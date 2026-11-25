// Eval runner.
//
//   npm run eval -- --model claude-opus-5-5 --trials 3
//   npm run eval:oracle        # reference solutions, must be 100%
//   npm run eval:null          # do-nothing agent, must be ~0%
//
// Every trial gets a fresh in-memory world and its own MCP server instance,
// connected over the MCP in-memory transport, so the agent goes through the
// real protocol (listTools / callTool) exactly as an MCP host would.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createGamblrServer } from "../src/server.js";
import { baseWorld, DEMO_USER } from "../src/store/fixtures.js";
import { MemoryStore } from "../src/store/memory.js";
import { makeClaudeAgent, nullAgent, oracleAgent, type Agent, type AgentResult } from "./agents.js";
import { grade, type Grade } from "./grade.js";
import { summarize, toMarkdown, type TrialRecord } from "./metrics.js";
import { TASKS, type Task } from "./tasks.js";

const here = dirname(fileURLToPath(import.meta.url));

const { values: args } = parseArgs({
    options: {
        agent: { type: "string", default: "claude" },
        model: { type: "string", default: "claude-opus-5-5" },
        effort: { type: "string" },
        trials: { type: "string" },
        concurrency: { type: "string", default: "4" },
        filter: { type: "string" },
        "max-turns": { type: "string", default: "15" },
        "ablate-docs": { type: "boolean", default: false },
        label: { type: "string" },
        verbose: { type: "boolean", short: "v", default: false },
    },
});

async function runTrial(task: Task, trial: number, agent: Agent): Promise<TrialRecord> {
    const world = baseWorld();
    const store = new MemoryStore(world);
    const userId = task.user ?? DEMO_USER;
    const server = createGamblrServer(store, userId);
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    const mcp = new Client({ name: "gamblr-eval", version: "0.1.0" });
    await server.connect(serverT);
    await mcp.connect(clientT);

    const started = Date.now();
    let result: AgentResult;
    try {
        result = await agent({ task, mcp });
    } catch (e) {
        result = {
            reply: "",
            tool_calls: [],
            turns: 0,
            stop_reason: "exception",
            usage: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
            error: e instanceof Error ? e.message : String(e),
        };
    }
    const latency_ms = Date.now() - started;
    await mcp.close();
    await server.close();

    const g: Grade = grade(task, world, store, userId, result.reply);
    // An infrastructure error (API outage, exception) is a failed trial, recorded separately.
    return {
        task_id: task.id,
        category: task.category,
        trial,
        pass: g.pass && !result.error,
        checks: g.checks,
        unexpected_money_movement: g.unexpected_money_movement,
        expects_no_bet: task.expect.bets.length === 0,
        latency_ms,
        ...result,
    };
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    await Promise.all(
        Array.from({ length: Math.min(n, items.length) }, async () => {
            while (next < items.length) {
                const i = next++;
                out[i] = await fn(items[i]);
            }
        })
    );
    return out;
}

async function main() {
    const kind = args.agent!;
    let agent: Agent;
    if (kind === "oracle") agent = oracleAgent;
    else if (kind === "null") agent = nullAgent;
    else if (kind === "claude")
        agent = makeClaudeAgent({
            model: args.model!,
            effort: args.effort as never,
            maxTurns: Number(args["max-turns"]),
            ablateDocs: args["ablate-docs"]!,
        });
    else throw new Error(`unknown --agent ${kind}`);

    const trials = Number(args.trials ?? (kind === "claude" ? 3 : 1));
    const tasks = TASKS.filter((t) => !args.filter || t.id.includes(args.filter));
    const jobs = tasks.flatMap((task) => Array.from({ length: trials }, (_, i) => ({ task, trial: i + 1 })));

    const label =
        args.label ??
        (kind === "claude"
            ? `${args.model}${args.effort ? `-${args.effort}` : ""}${args["ablate-docs"] ? "-nodocs" : ""}`
            : kind);
    console.error(`Running ${tasks.length} tasks x ${trials} trials (${jobs.length} runs) — ${label}`);

    let done = 0;
    const records = await pool(jobs, Number(args.concurrency), async ({ task, trial }) => {
        const r = await runTrial(task, trial, agent);
        done++;
        const mark = r.pass ? "PASS" : "FAIL";
        console.error(`[${done}/${jobs.length}] ${mark} ${task.id} #${trial}${r.error ? ` (${r.error})` : ""}`);
        if (!r.pass && args.verbose) {
            for (const c of r.checks.filter((c) => !c.pass)) console.error(`      ✗ ${c.name} ${c.detail ?? ""}`);
            console.error(`      reply: ${r.reply.slice(0, 300).replace(/\n/g, " ")}`);
        }
        return r;
    });

    const meta = {
        label,
        agent: kind,
        model: kind === "claude" ? args.model : null,
        effort: args.effort ?? null,
        ablate_docs: args["ablate-docs"],
        trials,
        tasks: tasks.length,
        started_at: new Date().toISOString(),
    };
    const summary = summarize(records, meta.model);
    const md = toMarkdown(meta, summary, records);

    const outDir = join(here, "results");
    mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = join(outDir, `${stamp}_${label}`);
    writeFileSync(`${base}.json`, JSON.stringify({ meta, summary, records }, null, 2));
    writeFileSync(`${base}.md`, md);

    console.log(md);
    console.error(`\nWrote ${base}.json and .md`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
