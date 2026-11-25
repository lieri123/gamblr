// Spawns the real stdio entrypoint and talks to it as an MCP host would.
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("stdio server lists tools and serves calls", async () => {
    const transport = new StdioClientTransport({
        command: process.execPath,
        args: ["--import", "tsx", join(root, "src/index.ts")],
        cwd: root,
        env: { ...process.env, GAMBLR_BACKEND: "memory" } as Record<string, string>,
        stderr: "ignore",
    });
    const client = new Client({ name: "smoke", version: "0" });
    await client.connect(transport);
    try {
        const { tools } = await client.listTools();
        assert.deepEqual(
            tools.map((t) => t.name).sort(),
            ["get_game", "get_my_profile", "list_my_bets", "list_sports", "place_bet", "quote_payout", "search_games", "set_followed_sports"]
        );
        assert.match(client.getInstructions() ?? "", /irreversible|cannot be undone/);
        const r = await client.callTool({ name: "search_games", arguments: { team: "Lakers" } });
        assert.equal((r.structuredContent as { count: number }).count, 1);
        const bad = await client.callTool({ name: "place_bet", arguments: { game_id: "nba_lal_bos", team: "Draw", stake: 5 } });
        assert.equal(bad.isError, true);
    } finally {
        await client.close();
    }
});
