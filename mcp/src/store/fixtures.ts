import type { Game } from "../types.js";
import type { World } from "./memory.js";

// A frozen slate of games used by tests and evals. The clock is Saturday
// 2026-03-14 18:00 UTC (2pm in New York). Odds are invented.
//
// Deliberate traps the eval set relies on:
//  - "New York" matches the Knicks (NBA), Rangers (NHL), and Yankees (MLB).
//  - "Boston" matches the Celtics, Bruins, and Red Sox.
//  - Bulls/Bucks and Spurs/Everton have already started.
//  - The demo user already bet on Knicks/Heat.
//  - EPL moneylines have three outcomes (home, away, Draw).
//  - No Golden State Warriors game exists.

export const NOW = "2026-03-14T18:00:00.000Z";

function ml(home: [string, number], away: [string, number], draw?: number) {
    const outcomes = [
        { name: home[0], price: home[1] },
        { name: away[0], price: away[1] },
    ];
    if (draw !== undefined) outcomes.push({ name: "Draw", price: draw });
    return { key: "h2h", outcomes };
}

function spread(home: string, away: string, homePoint: number) {
    return {
        key: "spreads",
        outcomes: [
            { name: home, price: -110, point: homePoint },
            { name: away, price: -110, point: -homePoint },
        ],
    };
}

function total(points: number) {
    return {
        key: "totals",
        outcomes: [
            { name: "Over", price: -110, point: points },
            { name: "Under", price: -110, point: points },
        ],
    };
}

function game(
    id: string,
    sport: [string, string],
    home: string,
    away: string,
    commence: string,
    homeOdds: number,
    awayOdds: number,
    extra: { draw?: number; spread?: number; total?: number } = {}
): Game {
    const markets = [ml([home, homeOdds], [away, awayOdds], extra.draw)];
    if (extra.spread !== undefined) markets.push(spread(home, away, extra.spread));
    if (extra.total !== undefined) markets.push(total(extra.total));
    return {
        id,
        sport_key: sport[0],
        sport_title: sport[1],
        home_team: home,
        away_team: away,
        commence_time: commence,
        markets,
    };
}

const NBA: [string, string] = ["basketball_nba", "NBA"];
const NHL: [string, string] = ["icehockey_nhl", "NHL"];
const EPL: [string, string] = ["soccer_epl", "EPL"];
const MLB: [string, string] = ["baseball_mlb", "MLB"];

export const GAMES: Game[] = [
    // NBA — tonight (New York time) unless noted
    game("nba_lal_bos", NBA, "Los Angeles Lakers", "Boston Celtics", "2026-03-15T02:30:00Z", 135, -155, { spread: 3.5, total: 228.5 }),
    game("nba_nyk_mia", NBA, "New York Knicks", "Miami Heat", "2026-03-14T23:30:00Z", -210, 175, { spread: -5.5, total: 219.5 }),
    game("nba_den_phx", NBA, "Denver Nuggets", "Phoenix Suns", "2026-03-15T03:00:00Z", -120, 100, { spread: -1.5, total: 231 }),
    game("nba_chi_mil", NBA, "Chicago Bulls", "Milwaukee Bucks", "2026-03-14T17:00:00Z", 240, -300), // already started
    game("nba_dal_hou", NBA, "Dallas Mavericks", "Houston Rockets", "2026-03-16T00:00:00Z", 110, -130, { spread: 2 }), // tomorrow
    // NHL
    game("nhl_nyr_tor", NHL, "New York Rangers", "Toronto Maple Leafs", "2026-03-14T23:00:00Z", -115, -105),
    game("nhl_bos_mtl", NHL, "Boston Bruins", "Montreal Canadiens", "2026-03-15T00:00:00Z", -180, 150),
    // EPL — tomorrow, three-way moneyline
    game("epl_ars_che", EPL, "Arsenal", "Chelsea", "2026-03-15T15:00:00Z", -140, 360, { draw: 275, spread: -0.5 }),
    game("epl_liv_mci", EPL, "Liverpool", "Manchester City", "2026-03-15T16:30:00Z", 120, 210, { draw: 250 }),
    game("epl_tot_eve", EPL, "Tottenham Hotspur", "Everton", "2026-03-14T15:00:00Z", -105, 290, { draw: 260 }), // already started
    // MLB — Tuesday
    game("mlb_nyy_bos", MLB, "New York Yankees", "Boston Red Sox", "2026-03-17T23:05:00Z", -145, 125),
];

export const DEMO_USER = "u_demo";
export const NO_CARD_USER = "u_nocard";
export const DECLINED_USER = "u_declined";

export function baseWorld(): World {
    return {
        now: NOW,
        games: structuredClone(GAMES),
        users: [
            { id: DEMO_USER, username: "jordan", preferences: ["NBA"], stripe_id: "cus_demo", timezone: "America/New_York" },
            { id: NO_CARD_USER, username: "sam", preferences: [], stripe_id: null, timezone: "America/New_York" },
            { id: DECLINED_USER, username: "riley", preferences: ["EPL"], stripe_id: "cus_riley", timezone: "America/New_York" },
        ],
        predictions: [
            {
                id: "p_seed_1",
                from_user_id: DEMO_USER,
                bet_id: "nba_nyk_mia",
                predicted: "Miami Heat",
                amount: 40,
                created_at: "2026-03-13T20:00:00.000Z",
            },
            {
                id: "p_seed_2",
                from_user_id: DEMO_USER,
                bet_id: "epl_tot_eve",
                predicted: "Everton",
                amount: 15,
                created_at: "2026-03-12T09:00:00.000Z",
            },
        ],
        cards: { cus_demo: "card_visa_4242", cus_riley: "card_declined_0002" },
    };
}
