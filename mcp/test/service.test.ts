import assert from "node:assert/strict";
import { test } from "node:test";
import { GamblrService, payoutFor, toMultiplier, ToolError } from "../src/service.js";
import { baseWorld, DECLINED_USER, DEMO_USER, NO_CARD_USER } from "../src/store/fixtures.js";
import { MemoryStore } from "../src/store/memory.js";

const setup = (user = DEMO_USER) => {
    const store = new MemoryStore(baseWorld());
    return { store, svc: new GamblrService(store, user) };
};

async function rejects(p: Promise<unknown>, code: string) {
    await assert.rejects(p, (e: unknown) => e instanceof ToolError && e.code === code);
}

test("payout math matches the app's BetModal", () => {
    assert.equal(toMultiplier(-155), 1.64);
    assert.equal(toMultiplier(135), 2.35);
    assert.equal(payoutFor(50, -155), 82);
    assert.equal(payoutFor(40, -115), 74.4);
});

test("search hides started games unless asked", async () => {
    const { svc } = setup();
    assert.equal((await svc.searchGames({ team: "Bucks" })).count, 0);
    const r = await svc.searchGames({ team: "Bucks", include_started: true });
    assert.equal(r.count, 1);
    assert.equal(r.games[0].started, true);
});

test("city search is ambiguous across sports", async () => {
    const { svc } = setup();
    const teams = (await svc.searchGames({ team: "Boston" })).games.map((g) => g.game_id).sort();
    assert.deepEqual(teams, ["mlb_nyy_bos", "nba_lal_bos", "nhl_bos_mtl"]);
});

test("placeBet charges then records, rounding to cents", async () => {
    const { svc, store } = setup();
    const r = await svc.placeBet("nba_lal_bos", "los angeles lakers", 12.345);
    assert.equal(r.pick, "Los Angeles Lakers");
    assert.equal(r.stake, 12.35);
    assert.equal(store.charges.length, 1);
    assert.equal(store.charges[0].amount_cents, 1235);
});

test("placeBet rejects bad input without charging", async () => {
    const { svc, store } = setup();
    await rejects(svc.placeBet("nba_lal_bos", "Boston Celtics", 1000), "invalid_stake");
    await rejects(svc.placeBet("nba_lal_bos", "Boston Celtics", 0.5), "invalid_stake");
    await rejects(svc.placeBet("nba_chi_mil", "Milwaukee Bucks", 20), "game_started");
    await rejects(svc.placeBet("nba_nyk_mia", "Miami Heat", 30), "duplicate_bet");
    await rejects(svc.placeBet("epl_ars_che", "Draw", 20), "invalid_team");
    await rejects(svc.placeBet("nope", "Arsenal", 20), "game_not_found");
    assert.equal(store.charges.length, 0);
});

test("placeBet needs a working card", async () => {
    await rejects(setup(NO_CARD_USER).svc.placeBet("nba_lal_bos", "Boston Celtics", 20), "no_payment_method");
    const d = setup(DECLINED_USER);
    await rejects(d.svc.placeBet("epl_ars_che", "Arsenal", 25), "card_declined");
    assert.equal(d.store.world.predictions.filter((p) => p.from_user_id === DECLINED_USER).length, 0);
});

test("placeBet refunds when the insert fails", async () => {
    const { svc, store } = setup();
    store.insertPrediction = async () => {
        throw new Error("db down");
    };
    await rejects(svc.placeBet("nba_lal_bos", "Boston Celtics", 20), "insert_failed");
    assert.equal(store.charges[0].status, "refunded");
});

test("list_my_bets totals stakes", async () => {
    const r = await setup().svc.listMyBets();
    assert.equal(r.count, 2);
    assert.equal(r.total_staked, 55);
    assert.equal(r.bets.find((b) => b.pick === "Miami Heat")?.potential_payout, 110);
});

test("after a decline, the user can fix their card and retry", async () => {
    const { svc, store } = setup(DECLINED_USER);
    await rejects(svc.placeBet("epl_ars_che", "Arsenal", 25), "card_declined");
    store.world.cards.cus_riley = "card_visa_4242"; // user saves a working card
    const r = await svc.placeBet("epl_ars_che", "Arsenal", 25);
    assert.equal(r.status, "placed");
});

test("after a decline, the user can retry with a different stake", async () => {
    const { svc, store } = setup(DECLINED_USER);
    await rejects(svc.placeBet("epl_ars_che", "Arsenal", 25), "card_declined");
    store.world.cards.cus_riley = "card_visa_4242";
    const r = await svc.placeBet("epl_ars_che", "Arsenal", 10);
    assert.equal(r.stake, 10);
});

test("two simultaneous bets on one game: one bet, one net charge", async () => {
    const { svc, store } = setup();
    const results = await Promise.allSettled([
        svc.placeBet("nba_lal_bos", "Boston Celtics", 20),
        svc.placeBet("nba_lal_bos", "Los Angeles Lakers", 30),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    assert.equal((rejected.reason as ToolError).code, "duplicate_bet");
    assert.equal(store.world.predictions.filter((p) => p.bet_id === "nba_lal_bos").length, 1);
    assert.equal(store.charges.filter((c) => c.status === "succeeded").length, 1);
});
