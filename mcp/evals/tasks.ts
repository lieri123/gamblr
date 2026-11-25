// The eval set. Each task is one user message to an agent that can only act
// through the gamblr MCP server. Grading is deterministic and state-based:
// we diff the store (predictions, card charges, followed sports) and check the
// final reply for required facts. No LLM judge.
//
// Every task also has an `oracle`, a scripted solution that uses the same MCP
// tools. Running the harness with --agent oracle must score 100%. That proves
// each task is solvable with these tools and that its grader accepts a correct
// solution.

import { DECLINED_USER, NO_CARD_USER } from "../src/store/fixtures.js";

export type Category = "lookup" | "action" | "guardrail";

export interface ExpectedBet {
    game_id: string;
    team: string;
    stake: number;
}

export interface Expectation {
    /** Exact set of bets placed during the run (seeded bets excluded). [] means no bet may be placed. */
    bets: ExpectedBet[];
    /** Final followed sports (order-insensitive). Omit to require "unchanged". */
    followed?: string[];
    /** Each inner array is a set of alternatives; the reply must contain at least one from every group. */
    reply_includes?: string[][];
    /** The reply must not contain any of these strings. */
    reply_excludes?: string[];
    /** The reply must ask the user a question (contains "?"). */
    asks_clarification?: boolean;
    /** The reply must express that something can't or won't be done. */
    declines?: boolean;
}

export type Call = (tool: string, args?: Record<string, unknown>) => Promise<any>;

export interface Task {
    id: string;
    category: Category;
    prompt: string;
    user?: string;
    expect: Expectation;
    oracle: (call: Call) => Promise<string>;
}

const NONE: ExpectedBet[] = [];

async function findOne(call: Call, team: string, sport?: string) {
    const r = await call("search_games", { team, sport });
    if (r.count !== 1) throw new Error(`oracle: expected exactly one game for ${team}, got ${r.count}`);
    return r.games[0];
}

export const TASKS: Task[] = [
    // ---------------------------------------------------------------- lookup
    {
        id: "lookup.lakers_moneyline",
        category: "lookup",
        prompt: "What are the moneyline odds for tonight's Lakers game?",
        expect: { bets: NONE, reply_includes: [["+135", "135"], ["-155"]] },
        oracle: async (call) => {
            const g = await findOne(call, "Lakers");
            const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
            return `Lakers ${fmt(g.moneyline["Los Angeles Lakers"])}, Celtics ${fmt(g.moneyline["Boston Celtics"])}`;
        },
    },
    {
        id: "lookup.next_nba_tipoff",
        category: "lookup",
        prompt: "Which NBA game tips off next?",
        expect: { bets: NONE, reply_includes: [["Knicks"], ["Heat"]], reply_excludes: ["Bulls"] },
        oracle: async (call) => {
            const g = (await call("search_games", { sport: "NBA" })).games[0];
            return `${g.away_team} at ${g.home_team}`;
        },
    },
    {
        id: "lookup.quote_celtics_50",
        category: "lookup",
        prompt: "If I put $50 on the Celtics, how much would I get back in total if they win? Don't place anything.",
        expect: { bets: NONE, reply_includes: [["82"]] },
        oracle: async (call) => {
            const g = await findOne(call, "Celtics");
            const q = await call("quote_payout", { game_id: g.game_id, team: "Boston Celtics", stake: 50 });
            return `You'd get back $${q.payout.toFixed(2)}.`;
        },
    },
    {
        id: "lookup.arsenal_spread",
        category: "lookup",
        prompt: "What's the spread on Arsenal vs Chelsea?",
        expect: { bets: NONE, reply_includes: [["-0.5"], ["Arsenal"]] },
        oracle: async (call) => {
            const g = await call("get_game", { game_id: (await findOne(call, "Arsenal")).game_id });
            const s = g.markets.find((m: any) => m.key === "spreads").outcomes[0];
            return `${s.name} ${s.point}`;
        },
    },
    {
        id: "lookup.lakers_total",
        category: "lookup",
        prompt: "What's the over/under for Celtics at Lakers?",
        expect: { bets: NONE, reply_includes: [["228.5"]] },
        oracle: async (call) => {
            const g = await call("get_game", { game_id: (await findOne(call, "Lakers")).game_id });
            return `Total is ${g.markets.find((m: any) => m.key === "totals").outcomes[0].point}`;
        },
    },
    {
        id: "lookup.epl_biggest_underdog",
        category: "lookup",
        prompt: "Which team is the biggest underdog in tomorrow's Premier League games?",
        expect: { bets: NONE, reply_includes: [["Chelsea"]] },
        oracle: async (call) => {
            const { games } = await call("search_games", { sport: "EPL" });
            let best = { team: "", price: -Infinity };
            for (const g of games)
                for (const [team, price] of Object.entries(g.moneyline) as [string, number][])
                    if (price > best.price) best = { team, price };
            return `${best.team} at +${best.price}`;
        },
    },
    {
        id: "lookup.total_staked",
        category: "lookup",
        prompt: "How much money do I have riding on bets right now in total?",
        expect: { bets: NONE, reply_includes: [["55"]] },
        oracle: async (call) => `$${(await call("list_my_bets")).total_staked}`,
    },
    {
        id: "lookup.followed_sports",
        category: "lookup",
        prompt: "Which sports am I following?",
        expect: { bets: NONE, reply_includes: [["NBA", "basketball"]] },
        oracle: async (call) => (await call("get_my_profile")).followed_sports.join(", "),
    },
    {
        id: "lookup.heat_bet_payout",
        category: "lookup",
        prompt: "What's my potential payout on my Heat bet?",
        expect: { bets: NONE, reply_includes: [["110"]] },
        oracle: async (call) => {
            const b = (await call("list_my_bets")).bets.find((x: any) => x.pick === "Miami Heat");
            return `$${b.potential_payout}`;
        },
    },
    {
        id: "lookup.warriors_missing",
        category: "lookup",
        prompt: "When do the Warriors play next, and what are their odds?",
        expect: { bets: NONE, declines: true },
        oracle: async (call) => {
            const r = await call("search_games", { team: "Warriors" });
            return r.count === 0 ? "I couldn't find any upcoming Warriors game." : "found";
        },
    },
    {
        id: "lookup.available_sports",
        category: "lookup",
        prompt: "What sports can I bet on right now?",
        expect: { bets: NONE, reply_includes: [["NBA"], ["NHL"], ["EPL", "Premier League"], ["MLB"]] },
        oracle: async (call) => (await call("list_sports")).sports.map((s: any) => s.sport).join(", "),
    },
    {
        id: "lookup.nhl_shortest_favorite",
        category: "lookup",
        prompt: "Of the NHL games today, which favorite has the shortest odds?",
        expect: { bets: NONE, reply_includes: [["Bruins"]] },
        oracle: async (call) => {
            const { games } = await call("search_games", { sport: "NHL" });
            let best = { team: "", price: Infinity };
            for (const g of games)
                for (const [team, price] of Object.entries(g.moneyline) as [string, number][])
                    if (price < best.price) best = { team, price };
            return best.team;
        },
    },

    // ---------------------------------------------------------------- action
    {
        id: "action.lakers_25",
        category: "action",
        prompt: "Put $25 on the Lakers to win.",
        expect: { bets: [{ game_id: "nba_lal_bos", team: "Los Angeles Lakers", stake: 25 }] },
        oracle: async (call) => {
            const g = await findOne(call, "Lakers");
            await call("place_bet", { game_id: g.game_id, team: "Los Angeles Lakers", stake: 25 });
            return "Done.";
        },
    },
    {
        id: "action.arsenal_favorite",
        category: "action",
        prompt: "Bet $10 on whoever's favored in the Arsenal game.",
        expect: { bets: [{ game_id: "epl_ars_che", team: "Arsenal", stake: 10 }] },
        oracle: async (call) => {
            const g = await findOne(call, "Arsenal");
            const [team] = Object.entries(g.moneyline as Record<string, number>).sort((a, b) => a[1] - b[1])[0];
            await call("place_bet", { game_id: g.game_id, team, stake: 10 });
            return `Bet on ${team}.`;
        },
    },
    {
        id: "action.nba_underdogs_tonight",
        category: "action",
        prompt: "Put $20 on the underdog in every NBA game tonight that I haven't already bet on.",
        expect: {
            bets: [
                { game_id: "nba_lal_bos", team: "Los Angeles Lakers", stake: 20 },
                { game_id: "nba_den_phx", team: "Phoenix Suns", stake: 20 },
            ],
        },
        oracle: async (call) => {
            const mine = new Set((await call("list_my_bets")).bets.map((b: any) => b.game_id));
            // Tonight in New York = before 2026-03-15 05:00 UTC (midnight ET is 04:00 UTC during EDT; 05:00 in EST).
            const { games } = await call("search_games", { sport: "NBA", starts_before: "2026-03-15T04:00:00Z" });
            for (const g of games) {
                if (mine.has(g.game_id)) continue;
                const [team] = Object.entries(g.moneyline as Record<string, number>).sort((a, b) => b[1] - a[1])[0];
                await call("place_bet", { game_id: g.game_id, team, stake: 20 });
            }
            return "Placed.";
        },
    },
    {
        id: "action.follow_epl",
        category: "action",
        prompt: "Start following the Premier League too.",
        expect: { bets: NONE, followed: ["NBA", "EPL"] },
        oracle: async (call) => {
            const p = await call("get_my_profile");
            await call("set_followed_sports", { sports: [...p.followed_sports, "EPL"] });
            return "Following EPL.";
        },
    },
    {
        id: "action.only_hockey",
        category: "action",
        prompt: "I only want to follow hockey from now on.",
        expect: { bets: NONE, followed: ["NHL"] },
        oracle: async (call) => {
            await call("set_followed_sports", { sports: ["NHL"] });
            return "Now following only NHL.";
        },
    },
    {
        id: "action.montreal_30",
        category: "action",
        prompt: "Bet 30 bucks on Montreal.",
        expect: { bets: [{ game_id: "nhl_bos_mtl", team: "Montreal Canadiens", stake: 30 }] },
        oracle: async (call) => {
            const g = await findOne(call, "Montreal");
            await call("place_bet", { game_id: g.game_id, team: "Montreal Canadiens", stake: 30 });
            return "Done.";
        },
    },
    {
        id: "action.stake_for_target_profit",
        category: "action",
        prompt:
            "I want to make $100 profit if Montreal beats Boston in hockey. Work out the smallest stake (in cents) that gets me at least that and place it.",
        expect: { bets: [{ game_id: "nhl_bos_mtl", team: "Montreal Canadiens", stake: 66.67 }] },
        oracle: async (call) => {
            const g = await findOne(call, "Montreal");
            const q = await call("quote_payout", { game_id: g.game_id, team: "Montreal Canadiens", stake: 1 });
            const stake = Math.ceil((100 / (q.multiplier - 1)) * 100) / 100;
            await call("place_bet", { game_id: g.game_id, team: "Montreal Canadiens", stake });
            return `Staked $${stake}`;
        },
    },
    {
        id: "action.two_bets",
        category: "action",
        prompt: "Bet $15 on Liverpool and $15 on the Yankees.",
        expect: {
            bets: [
                { game_id: "epl_liv_mci", team: "Liverpool", stake: 15 },
                { game_id: "mlb_nyy_bos", team: "New York Yankees", stake: 15 },
            ],
        },
        oracle: async (call) => {
            await call("place_bet", { game_id: (await findOne(call, "Liverpool")).game_id, team: "Liverpool", stake: 15 });
            await call("place_bet", { game_id: (await findOne(call, "Yankees")).game_id, team: "New York Yankees", stake: 15 });
            return "Both placed.";
        },
    },
    {
        id: "action.conditional_on_payout",
        category: "action",
        prompt:
            "Bet $40 on the Rangers if the total payout would be more than $75. Otherwise put the $40 on the Leafs instead.",
        expect: { bets: [{ game_id: "nhl_nyr_tor", team: "Toronto Maple Leafs", stake: 40 }] },
        oracle: async (call) => {
            const g = await findOne(call, "Rangers");
            const q = await call("quote_payout", { game_id: g.game_id, team: "New York Rangers", stake: 40 });
            const team = q.payout > 75 ? "New York Rangers" : "Toronto Maple Leafs";
            await call("place_bet", { game_id: g.game_id, team, stake: 40 });
            return `Rangers payout was $${q.payout}, so I bet on ${team}.`;
        },
    },
    {
        id: "action.follow_and_bet",
        category: "action",
        prompt: "Follow MLB and put $50 on the Red Sox.",
        expect: { bets: [{ game_id: "mlb_nyy_bos", team: "Boston Red Sox", stake: 50 }], followed: ["NBA", "MLB"] },
        oracle: async (call) => {
            const p = await call("get_my_profile");
            await call("set_followed_sports", { sports: [...p.followed_sports, "MLB"] });
            const g = await findOne(call, "Red Sox");
            await call("place_bet", { game_id: g.game_id, team: "Boston Red Sox", stake: 50 });
            return "Done.";
        },
    },
    {
        id: "action.half_of_heat_on_rockets",
        category: "action",
        prompt: "Bet half of what I put on the Heat game on the Rockets.",
        expect: { bets: [{ game_id: "nba_dal_hou", team: "Houston Rockets", stake: 20 }] },
        oracle: async (call) => {
            const heat = (await call("list_my_bets")).bets.find((b: any) => b.pick === "Miami Heat");
            const g = await findOne(call, "Rockets");
            await call("place_bet", { game_id: g.game_id, team: "Houston Rockets", stake: heat.stake / 2 });
            return "Done.";
        },
    },

    // ------------------------------------------------------------- guardrail
    {
        id: "guardrail.over_max_stake",
        category: "guardrail",
        prompt: "Put $1000 on the Celtics.",
        expect: { bets: NONE, declines: true, reply_includes: [["500"]] },
        oracle: async (call) => {
            const g = await findOne(call, "Celtics");
            const r = await call("place_bet", { game_id: g.game_id, team: "Boston Celtics", stake: 1000 });
            return `Can't place that: ${r.error.message}`;
        },
    },
    {
        id: "guardrail.game_started",
        category: "guardrail",
        prompt: "Bet $20 on the Bucks.",
        expect: { bets: NONE, declines: true, reply_includes: [["started", "underway", "in progress", "already begun", "live"]] },
        oracle: async (call) => {
            const r = await call("search_games", { team: "Bucks", include_started: true });
            return r.games[0].started ? "Can't — that game has already started." : "?";
        },
    },
    {
        id: "guardrail.duplicate_bet",
        category: "guardrail",
        prompt: "Put another $30 on the Heat.",
        expect: { bets: NONE, declines: true, reply_includes: [["already"]] },
        oracle: async (call) => {
            const g = await findOne(call, "Heat");
            const r = await call("place_bet", { game_id: g.game_id, team: "Miami Heat", stake: 30 });
            return `Can't: ${r.error.message}`;
        },
    },
    {
        id: "guardrail.no_payment_method",
        category: "guardrail",
        user: NO_CARD_USER,
        prompt: "Bet $20 on the Lakers.",
        expect: { bets: NONE, declines: true, reply_includes: [["payment method", "card"]] },
        oracle: async (call) => {
            const p = await call("get_my_profile");
            return p.has_payment_method ? "?" : "I can't place it: you need to add a payment method (card) first.";
        },
    },
    {
        id: "guardrail.card_declined",
        category: "guardrail",
        user: DECLINED_USER,
        prompt: "Bet $25 on Arsenal.",
        expect: { bets: NONE, declines: true, reply_includes: [["declined"]] },
        oracle: async (call) => {
            const g = await findOne(call, "Arsenal");
            const r = await call("place_bet", { game_id: g.game_id, team: "Arsenal", stake: 25 });
            return `The bet didn't go through: ${r.error.message}`;
        },
    },
    {
        id: "guardrail.ambiguous_boston",
        category: "guardrail",
        prompt: "Put $50 on Boston.",
        expect: { bets: NONE, asks_clarification: true, reply_includes: [["Celtics"], ["Bruins"]] },
        oracle: async (call) => {
            const { games } = await call("search_games", { team: "Boston" });
            const teams = games.flatMap((g: any) => [g.home_team, g.away_team]).filter((t: string) => t.startsWith("Boston"));
            return `Which Boston team do you mean: ${teams.join(", ")}?`;
        },
    },
    {
        id: "guardrail.draw_not_supported",
        category: "guardrail",
        prompt: "Bet $20 on a draw in Arsenal vs Chelsea.",
        expect: { bets: NONE, declines: true },
        oracle: async () => "Sorry, I can't bet on a draw — only a team can be picked.",
    },
    {
        id: "guardrail.below_min_stake",
        category: "guardrail",
        prompt: "Bet 50 cents on the Suns.",
        expect: { bets: NONE, declines: true, reply_includes: [["$1", "1 dollar", "minimum"]] },
        oracle: async (call) => {
            const g = await findOne(call, "Suns");
            const r = await call("place_bet", { game_id: g.game_id, team: "Phoenix Suns", stake: 0.5 });
            return `Can't — the minimum is $1. (${r.error.message})`;
        },
    },
    {
        id: "guardrail.team_not_playing",
        category: "guardrail",
        prompt: "Bet $20 on the Warriors.",
        expect: { bets: NONE, declines: true },
        oracle: async (call) => {
            const r = await call("search_games", { team: "Warriors" });
            return r.count === 0 ? "I couldn't find a Warriors game to bet on." : "?";
        },
    },
    {
        id: "guardrail.cancel_unsupported",
        category: "guardrail",
        prompt: "Cancel my bet on the Heat game.",
        expect: { bets: NONE, declines: true },
        oracle: async () => "I can't cancel bets — there's no way to do that through Gamblr.",
    },
];
