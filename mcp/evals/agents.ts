import Anthropic from "@anthropic-ai/sdk";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Task } from "./tasks.js";

export interface ToolCallLog {
    name: string;
    args: unknown;
    is_error: boolean;
}

export interface AgentResult {
    reply: string;
    tool_calls: ToolCallLog[];
    turns: number;
    stop_reason: string | null;
    usage: { input: number; output: number; cache_read: number; cache_write: number };
    error?: string;
}

export interface AgentContext {
    task: Task;
    mcp: Client;
}

export type Agent = (ctx: AgentContext) => Promise<AgentResult>;

const emptyUsage = () => ({ input: 0, output: 0, cache_read: 0, cache_write: 0 });

function parseResult(res: Awaited<ReturnType<Client["callTool"]>>): { data: any; isError: boolean; text: string } {
    const content = (res.content ?? []) as { type: string; text?: string }[];
    const text = content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
    let data: any = res.structuredContent;
    if (data === undefined) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }
    return { data, isError: Boolean(res.isError), text };
}

/** Runs the task's scripted reference solution. Must score 100%. */
export const oracleAgent: Agent = async ({ task, mcp }) => {
    const calls: ToolCallLog[] = [];
    const call = async (name: string, args: Record<string, unknown> = {}) => {
        const r = parseResult(await mcp.callTool({ name, arguments: args }));
        calls.push({ name, args, is_error: r.isError });
        return r.data;
    };
    const reply = await task.oracle(call);
    return { reply, tool_calls: calls, turns: 0, stop_reason: "oracle", usage: emptyUsage() };
};

/** Does nothing. Must score ~0%; anything it passes is a grader that's too loose. */
export const nullAgent: Agent = async () => ({
    reply: "OK.",
    tool_calls: [],
    turns: 0,
    stop_reason: "null",
    usage: emptyUsage(),
});

export interface ClaudeAgentOptions {
    model: string;
    effort?: "low" | "medium" | "high" | "xhigh" | "max";
    maxTurns: number;
    /** Strip server instructions and all tool/param descriptions (docs ablation). */
    ablateDocs: boolean;
}

const APP_PROMPT = `You are the assistant inside Gamblr, a sports betting app. You act for the signed-in user through the gamblr tools. Keep replies short and state the concrete result (odds, amounts, what was placed).`;

function stripDescriptions(schema: any): any {
    if (Array.isArray(schema)) return schema.map(stripDescriptions);
    if (schema && typeof schema === "object") {
        const out: any = {};
        for (const [k, v] of Object.entries(schema)) if (k !== "description") out[k] = stripDescriptions(v);
        return out;
    }
    return schema;
}

export function makeClaudeAgent(opts: ClaudeAgentOptions): Agent {
    const client = new Anthropic({ maxRetries: 6 });

    return async ({ task, mcp }) => {
        const usage = emptyUsage();
        const calls: ToolCallLog[] = [];

        const { tools: mcpTools } = await mcp.listTools();
        const tools: Anthropic.Tool[] = mcpTools.map((t) => {
            const { $schema: _ignored, ...schema } = t.inputSchema as Record<string, unknown>;
            return {
                name: t.name,
                ...(opts.ablateDocs ? {} : { description: t.description }),
                input_schema: (opts.ablateDocs ? stripDescriptions(schema) : schema) as Anthropic.Tool.InputSchema,
            };
        });
        const instructions = opts.ablateDocs ? "" : (mcp.getInstructions() ?? "");
        const system = [APP_PROMPT, instructions].filter(Boolean).join("\n\n");

        const messages: Anthropic.MessageParam[] = [{ role: "user", content: task.prompt }];
        let reply = "";
        for (let turn = 1; turn <= opts.maxTurns; turn++) {
            const res = await client.messages.create({
                model: opts.model,
                max_tokens: 16000,
                system,
                tools,
                messages,
                ...(opts.effort ? { output_config: { effort: opts.effort } } : {}),
            });
            usage.input += res.usage.input_tokens;
            usage.output += res.usage.output_tokens;
            usage.cache_read += res.usage.cache_read_input_tokens ?? 0;
            usage.cache_write += res.usage.cache_creation_input_tokens ?? 0;
            // Append the full content (thinking blocks included) so the next request is valid.
            messages.push({ role: "assistant", content: res.content });
            const text = res.content
                .filter((b): b is Anthropic.TextBlock => b.type === "text")
                .map((b) => b.text)
                .join("\n");
            if (text) reply = text;

            if (res.stop_reason !== "tool_use") {
                return { reply, tool_calls: calls, turns: turn, stop_reason: res.stop_reason, usage };
            }

            // Run every tool_use in this turn and return all results in one user message.
            const results: Anthropic.ToolResultBlockParam[] = [];
            for (const block of res.content) {
                if (block.type !== "tool_use") continue;
                const r = parseResult(
                    await mcp.callTool({ name: block.name, arguments: block.input as Record<string, unknown> })
                );
                calls.push({ name: block.name, args: block.input, is_error: r.isError });
                results.push({ type: "tool_result", tool_use_id: block.id, content: r.text, is_error: r.isError });
            }
            messages.push({ role: "user", content: results });
        }
        return { reply, tool_calls: calls, turns: opts.maxTurns, stop_reason: "max_turns", usage, error: "max_turns" };
    };
}
