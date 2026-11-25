import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { GamblrService, MAX_STAKE, MIN_STAKE, ToolError } from "./service.js";
import type { Store } from "./types.js";

const INSTRUCTIONS = `Gamblr is a sports betting app. Tools act on behalf of the signed-in user.
- Money moves only through place_bet, which charges the user's saved card immediately and cannot be undone.
- One bet per game per user. Stakes must be between $${MIN_STAKE} and $${MAX_STAKE}.
- Picks are a team name exactly as listed on the game (moneyline only; "Draw" is not a valid pick).
- Odds are American. Payout = stake x multiplier, where the multiplier is decimal odds floored to 2 places.
- Every search result includes "now"; interpret "tonight"/"tomorrow" in the user's timezone from get_my_profile.`;

async function run(fn: () => Promise<unknown>): Promise<CallToolResult> {
    try {
        const data = await fn();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            structuredContent: data as Record<string, unknown>,
        };
    } catch (e) {
        const err = e instanceof ToolError ? { code: e.code, message: e.message } : { code: "internal", message: String(e) };
        return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: err }) }] };
    }
}

export function createGamblrServer(store: Store, userId: string): McpServer {
    const svc = new GamblrService(store, userId);
    const server = new McpServer({ name: "gamblr", version: "0.1.0" }, { instructions: INSTRUCTIONS });
    const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

    server.registerTool(
        "list_sports",
        {
            title: "List sports",
            description: "List sports that have upcoming games, with counts, plus the current server time.",
            annotations: readOnly,
        },
        () => run(() => svc.listSports())
    );

    server.registerTool(
        "search_games",
        {
            title: "Search games",
            description:
                "Find games and their moneyline odds. All filters are optional and combine with AND. " +
                "`team` is a case-insensitive substring match, so a city like 'New York' can match several teams across sports. " +
                "Started games are excluded unless include_started is true.",
            inputSchema: {
                sport: z.string().optional().describe("Sport title, e.g. NBA, NHL, EPL, MLB"),
                team: z.string().optional().describe("Substring of a team name"),
                starts_after: z.string().optional().describe("ISO-8601 timestamp, inclusive"),
                starts_before: z.string().optional().describe("ISO-8601 timestamp, exclusive"),
                include_started: z.boolean().optional(),
            },
            annotations: readOnly,
        },
        (args) => run(() => svc.searchGames(args))
    );

    server.registerTool(
        "get_game",
        {
            title: "Get game",
            description: "Full detail for one game: moneyline (h2h), spreads, and totals markets with points and prices.",
            inputSchema: { game_id: z.string() },
            annotations: readOnly,
        },
        ({ game_id }) => run(() => svc.getGame(game_id))
    );

    server.registerTool(
        "quote_payout",
        {
            title: "Quote payout",
            description: "Compute the total payout (stake included) and profit for a hypothetical moneyline bet. Does not place a bet.",
            inputSchema: {
                game_id: z.string(),
                team: z.string().describe("Team name exactly as listed on the game"),
                stake: z.number().positive().describe("Stake in USD"),
            },
            annotations: readOnly,
        },
        ({ game_id, team, stake }) => run(() => svc.quotePayout(game_id, team, stake))
    );

    server.registerTool(
        "get_my_profile",
        {
            title: "Get my profile",
            description: "The signed-in user's username, timezone, followed sports, whether a card is saved, and stake limits.",
            annotations: readOnly,
        },
        () => run(() => svc.getProfile())
    );

    server.registerTool(
        "set_followed_sports",
        {
            title: "Set followed sports",
            description:
                "REPLACE the user's followed sports with exactly this list. To add or remove one sport, read the current list with get_my_profile first.",
            inputSchema: { sports: z.array(z.string()).describe("Full list of sport titles, e.g. [\"NBA\", \"EPL\"]") },
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        },
        ({ sports }) => run(() => svc.setFollowedSports(sports))
    );

    server.registerTool(
        "list_my_bets",
        {
            title: "List my bets",
            description: "All bets the user has placed, with stake, pick, current odds, potential payout, and total staked.",
            annotations: readOnly,
        },
        () => run(() => svc.listMyBets())
    );

    server.registerTool(
        "place_bet",
        {
            title: "Place bet",
            description:
                "Place a moneyline bet and immediately charge the user's saved card. Irreversible. " +
                `Stake must be $${MIN_STAKE}-$${MAX_STAKE}; one bet per game; the game must not have started.`,
            inputSchema: {
                game_id: z.string(),
                team: z.string().describe("Team name exactly as listed on the game"),
                stake: z.number().describe("Stake in USD, rounded to cents"),
            },
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
        },
        ({ game_id, team, stake }) => run(() => svc.placeBet(game_id, team, stake))
    );

    return server;
}
