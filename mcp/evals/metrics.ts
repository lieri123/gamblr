import type { AgentResult } from "./agents.js";
import type { Check } from "./grade.js";
import type { Category } from "./tasks.js";

export interface TrialRecord extends AgentResult {
    task_id: string;
    category: Category;
    trial: number;
    pass: boolean;
    checks: Check[];
    unexpected_money_movement: boolean;
    expects_no_bet: boolean;
    latency_ms: number;
}

// USD per million tokens: [input, output]. Cache reads bill at 0.1x input, writes at 1.25x.
const PRICES: Record<string, [number, number]> = {
    "claude-fable-5-2": [8, 40],
    "claude-opus-5-5": [4, 20],
    "claude-sonnet-5-5": [2, 10],
    "claude-haiku-5-5": [0.1, 0.5],
};

/** Wilson score interval, 95%. */
export function wilson(successes: number, n: number): [number, number] {
    if (n === 0) return [0, 0];
    const z = 1.96;
    const p = successes / n;
    const denom = 1 + (z * z) / n;
    const center = (p + (z * z) / (2 * n)) / denom;
    const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
    return [Math.max(0, center - half), Math.min(1, center + half)];
}

function pct(n: number): string {
    return `${(n * 100).toFixed(1)}%`;
}

function quantile(xs: number[], q: number): number {
    if (xs.length === 0) return 0;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

export interface Summary {
    runs: number;
    pass_at_1: number;
    pass_at_1_ci95: [number, number];
    pass_hat_k: number;
    by_category: Record<string, { runs: number; pass_at_1: number; pass_hat_k: number }>;
    unsafe_action_rate: number;
    unexpected_money_movement_runs: number;
    infra_errors: number;
    mean_tool_calls: number;
    mean_turns: number;
    latency_p50_ms: number;
    latency_p95_ms: number;
    tokens: { input: number; output: number; cache_read: number; cache_write: number };
    est_cost_usd: number | null;
    est_cost_per_success_usd: number | null;
    failing_checks: Record<string, number>;
}

function passHatK(records: TrialRecord[]): number {
    const byTask = new Map<string, boolean>();
    for (const r of records) byTask.set(r.task_id, (byTask.get(r.task_id) ?? true) && r.pass);
    const v = [...byTask.values()];
    return v.length ? v.filter(Boolean).length / v.length : 0;
}

export function summarize(records: TrialRecord[], model: string | null): Summary {
    const n = records.length;
    const passed = records.filter((r) => r.pass).length;

    const by_category: Summary["by_category"] = {};
    for (const cat of [...new Set(records.map((r) => r.category))]) {
        const rs = records.filter((r) => r.category === cat);
        by_category[cat] = {
            runs: rs.length,
            pass_at_1: rs.filter((r) => r.pass).length / rs.length,
            pass_hat_k: passHatK(rs),
        };
    }

    const noBet = records.filter((r) => r.expects_no_bet);
    const tokens = records.reduce(
        (t, r) => ({
            input: t.input + r.usage.input,
            output: t.output + r.usage.output,
            cache_read: t.cache_read + r.usage.cache_read,
            cache_write: t.cache_write + r.usage.cache_write,
        }),
        { input: 0, output: 0, cache_read: 0, cache_write: 0 }
    );
    const price = model ? PRICES[model] : undefined;
    const cost = price
        ? (tokens.input * price[0] +
              tokens.output * price[1] +
              tokens.cache_read * price[0] * 0.1 +
              tokens.cache_write * price[0] * 1.25) /
          1e6
        : null;

    const failing_checks: Record<string, number> = {};
    for (const r of records)
        for (const c of r.checks)
            if (!c.pass) {
                const key = c.name.split("(")[0];
                failing_checks[key] = (failing_checks[key] ?? 0) + 1;
            }

    return {
        runs: n,
        pass_at_1: n ? passed / n : 0,
        pass_at_1_ci95: wilson(passed, n),
        pass_hat_k: passHatK(records),
        by_category,
        unsafe_action_rate: noBet.length ? noBet.filter((r) => r.unexpected_money_movement).length / noBet.length : 0,
        unexpected_money_movement_runs: records.filter((r) => r.unexpected_money_movement).length,
        infra_errors: records.filter((r) => r.error && r.error !== "max_turns").length,
        mean_tool_calls: n ? records.reduce((s, r) => s + r.tool_calls.length, 0) / n : 0,
        mean_turns: n ? records.reduce((s, r) => s + r.turns, 0) / n : 0,
        latency_p50_ms: quantile(records.map((r) => r.latency_ms), 0.5),
        latency_p95_ms: quantile(records.map((r) => r.latency_ms), 0.95),
        tokens,
        est_cost_usd: cost,
        est_cost_per_success_usd: cost !== null && passed ? cost / passed : null,
        failing_checks,
    };
}

export function toMarkdown(
    meta: { label: string; trials: number; tasks: number },
    s: Summary,
    records: TrialRecord[]
): string {
    const lines: string[] = [];
    lines.push(`# gamblr MCP eval — ${meta.label}`, "");
    lines.push(`${meta.tasks} tasks × ${meta.trials} trials = ${s.runs} runs`, "");
    lines.push("| Metric | Value |", "| --- | --- |");
    lines.push(`| pass@1 | **${pct(s.pass_at_1)}** (95% CI ${pct(s.pass_at_1_ci95[0])}–${pct(s.pass_at_1_ci95[1])}) |`);
    lines.push(`| pass^${meta.trials} (all trials pass) | ${pct(s.pass_hat_k)} |`);
    lines.push(`| Unsafe action rate (bet/charge placed when none was wanted) | ${pct(s.unsafe_action_rate)} |`);
    lines.push(`| Runs with any unexpected money movement | ${s.unexpected_money_movement_runs} |`);
    lines.push(`| Infra errors | ${s.infra_errors} |`);
    lines.push(`| Mean tool calls / turns | ${s.mean_tool_calls.toFixed(2)} / ${s.mean_turns.toFixed(2)} |`);
    lines.push(`| Latency p50 / p95 | ${(s.latency_p50_ms / 1000).toFixed(1)}s / ${(s.latency_p95_ms / 1000).toFixed(1)}s |`);
    if (s.est_cost_usd !== null) {
        lines.push(`| Est. cost (total / per successful task) | $${s.est_cost_usd.toFixed(3)} / $${(s.est_cost_per_success_usd ?? 0).toFixed(4)} |`);
    }
    lines.push("", "## By category", "", "| Category | Runs | pass@1 | pass^k |", "| --- | --- | --- | --- |");
    for (const [cat, c] of Object.entries(s.by_category)) {
        lines.push(`| ${cat} | ${c.runs} | ${pct(c.pass_at_1)} | ${pct(c.pass_hat_k)} |`);
    }
    lines.push("", "## Per task", "", "| Task | Passed | Failing checks |", "| --- | --- | --- |");
    const ids = [...new Set(records.map((r) => r.task_id))];
    for (const id of ids) {
        const rs = records.filter((r) => r.task_id === id);
        const fails = [...new Set(rs.flatMap((r) => r.checks.filter((c) => !c.pass).map((c) => c.name)))];
        const errs = [...new Set(rs.map((r) => r.error).filter(Boolean))];
        lines.push(`| ${id} | ${rs.filter((r) => r.pass).length}/${rs.length} | ${[...fails, ...errs].join(", ") || "—"} |`);
    }
    return lines.join("\n") + "\n";
}
