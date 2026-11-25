// Side-by-side table from several result files.
//   npx tsx evals/compare.ts                       # every run in evals/results
//   npx tsx evals/compare.ts evals/results/a.json evals/results/b.json
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Summary } from "./metrics.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "results");
const files = process.argv.length > 2
    ? process.argv.slice(2)
    : readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => join(dir, f));

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const rows = files
    .map((f) => JSON.parse(readFileSync(f, "utf8")) as { meta: { label: string; trials: number; agent: string }; summary: Summary })
    .filter((r) => r.meta.agent === "claude" || process.argv.length > 2)
    .sort((a, b) => b.summary.pass_at_1 - a.summary.pass_at_1);

const out = [
    "| Run | pass@1 (95% CI) | pass^k | lookup | action | guardrail | unsafe actions | tool calls | $/success |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(({ meta, summary: s }) => {
        const c = (k: string) => (s.by_category[k] ? pct(s.by_category[k].pass_at_1) : "—");
        return `| ${meta.label} | **${pct(s.pass_at_1)}** (${pct(s.pass_at_1_ci95[0])}–${pct(s.pass_at_1_ci95[1])}) | ${pct(s.pass_hat_k)} (k=${meta.trials}) | ${c("lookup")} | ${c("action")} | ${c("guardrail")} | ${pct(s.unsafe_action_rate)} | ${s.mean_tool_calls.toFixed(1)} | ${s.est_cost_per_success_usd === null ? "—" : `$${s.est_cost_per_success_usd.toFixed(4)}`} |`;
    }),
].join("\n");

console.log(out);
writeFileSync(join(dir, "COMPARISON.md"), `# gamblr MCP eval: comparison\n\n${out}\n`);
