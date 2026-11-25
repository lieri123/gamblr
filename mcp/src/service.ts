import { randomUUID } from "node:crypto";
import type { Game, Market, Store } from "./types.js";
import { CardError, DuplicateBetError } from "./types.js";

// Same limits and payout math as lib/actions/betting.ts and components/BetModal.tsx.
export const MIN_STAKE = 1;
export const MAX_STAKE = 500;

export function americanToDecimal(american: number): number {
    if (!Number.isFinite(american) || american === 0) return 1;
    return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

export function toMultiplier(american: number): number {
    return Math.floor(americanToDecimal(american) * 100) / 100;
}

export function payoutFor(stake: number, american: number): number {
    return Math.round(stake * toMultiplier(american) * 100) / 100;
}

export class ToolError extends Error {
    constructor(
        public code: string,
        message: string
    ) {
        super(message);
    }
}

export interface GameSummary {
    game_id: string;
    sport: string;
    home_team: string;
    away_team: string;
    commence_time: string;
    started: boolean;
    moneyline: { [team: string]: number | null };
}

function h2h(game: Game): Market | undefined {
    return game.markets.find((m) => m.key === "h2h") ?? game.markets[0];
}

function moneylineFor(game: Game, team: string): number | null {
    const o = h2h(game)?.outcomes.find((x) => x.name === team);
    return o && Number.isFinite(o.price) ? o.price : null;
}

function norm(s: string): string {
    return s.trim().toLowerCase();
}

export class GamblrService {
    constructor(
        private store: Store,
        private userId: string
    ) {}

    private started(game: Game): boolean {
        return new Date(game.commence_time).getTime() <= this.store.now().getTime();
    }

    private summarize(game: Game): GameSummary {
        return {
            game_id: game.id,
            sport: game.sport_title,
            home_team: game.home_team,
            away_team: game.away_team,
            commence_time: game.commence_time,
            started: this.started(game),
            moneyline: {
                [game.home_team]: moneylineFor(game, game.home_team),
                [game.away_team]: moneylineFor(game, game.away_team),
            },
        };
    }

    private async requireGame(gameId: string): Promise<Game> {
        const game = await this.store.getGame(gameId);
        if (!game) {
            throw new ToolError("game_not_found", `No game with id "${gameId}". Use search_games to find ids.`);
        }
        return game;
    }

    private resolveTeam(game: Game, team: string): string {
        const match = [game.home_team, game.away_team].find((t) => norm(t) === norm(team));
        if (!match) {
            throw new ToolError(
                "invalid_team",
                `"${team}" is not playing in this game. Valid picks: "${game.home_team}" or "${game.away_team}".`
            );
        }
        return match;
    }

    async listSports() {
        const games = await this.store.listGames({ includeStarted: false });
        const counts = new Map<string, number>();
        for (const g of games) counts.set(g.sport_title, (counts.get(g.sport_title) ?? 0) + 1);
        return {
            now: this.store.now().toISOString(),
            sports: [...counts].map(([sport, upcoming_games]) => ({ sport, upcoming_games })),
        };
    }

    async searchGames(args: {
        sport?: string;
        team?: string;
        starts_after?: string;
        starts_before?: string;
        include_started?: boolean;
    }) {
        let games = await this.store.listGames({ includeStarted: args.include_started ?? false });
        if (args.sport) games = games.filter((g) => norm(g.sport_title) === norm(args.sport!));
        if (args.team) {
            const q = norm(args.team);
            games = games.filter((g) => norm(g.home_team).includes(q) || norm(g.away_team).includes(q));
        }
        if (args.starts_after) {
            const t = Date.parse(args.starts_after);
            if (Number.isNaN(t)) throw new ToolError("bad_date", "starts_after must be an ISO-8601 timestamp.");
            games = games.filter((g) => Date.parse(g.commence_time) >= t);
        }
        if (args.starts_before) {
            const t = Date.parse(args.starts_before);
            if (Number.isNaN(t)) throw new ToolError("bad_date", "starts_before must be an ISO-8601 timestamp.");
            games = games.filter((g) => Date.parse(g.commence_time) < t);
        }
        games.sort((a, b) => a.commence_time.localeCompare(b.commence_time));
        return { now: this.store.now().toISOString(), count: games.length, games: games.map((g) => this.summarize(g)) };
    }

    async getGame(gameId: string) {
        const game = await this.requireGame(gameId);
        return { ...this.summarize(game), markets: game.markets };
    }

    async quotePayout(gameId: string, team: string, stake: number) {
        const game = await this.requireGame(gameId);
        const pick = this.resolveTeam(game, team);
        const odds = moneylineFor(game, pick);
        if (odds === null) throw new ToolError("no_odds", `No moneyline price for ${pick}.`);
        return {
            game_id: game.id,
            team: pick,
            stake,
            american_odds: odds,
            multiplier: toMultiplier(odds),
            payout: payoutFor(stake, odds),
            profit: Math.round((payoutFor(stake, odds) - stake) * 100) / 100,
        };
    }

    async getProfile() {
        const user = await this.store.getUser(this.userId);
        if (!user) throw new ToolError("not_authenticated", "No user for this session.");
        const card = user.stripe_id ? await this.store.defaultCard(user.stripe_id) : null;
        return {
            username: user.username,
            timezone: user.timezone ?? "UTC",
            followed_sports: user.preferences,
            has_payment_method: card !== null,
            stake_limits: { min: MIN_STAKE, max: MAX_STAKE },
        };
    }

    async setFollowedSports(sports: string[]) {
        const cleaned = [...new Set(sports.map((s) => s.trim()).filter(Boolean))];
        await this.store.setPreferences(this.userId, cleaned);
        return { followed_sports: cleaned };
    }

    async listMyBets() {
        const preds = await this.store.listPredictions(this.userId);
        const bets = [];
        for (const p of preds) {
            const game = await this.store.getGame(p.bet_id);
            const odds = game ? moneylineFor(game, p.predicted) : null;
            bets.push({
                game_id: p.bet_id,
                matchup: game ? `${game.away_team} @ ${game.home_team}` : null,
                sport: game?.sport_title ?? null,
                commence_time: game?.commence_time ?? null,
                pick: p.predicted,
                stake: p.amount,
                current_odds: odds,
                potential_payout: odds === null ? null : payoutFor(p.amount, odds),
                placed_at: p.created_at,
            });
        }
        const total = Math.round(bets.reduce((s, b) => s + b.stake, 0) * 100) / 100;
        return { count: bets.length, total_staked: total, bets };
    }

    /**
     * Mirrors placeBet() in lib/actions/betting.ts: validate, charge, insert, refund on failure.
     *
     * Two deliberate differences from the app:
     *  - The Stripe idempotency key is unique per attempt. A key per (user, game) makes Stripe
     *    replay a decline for 24h, so a user who fixes their card or changes the stake can't retry.
     *  - The existing-bet check above is only a fast path. The real guard against two bets on one
     *    game is the database unique constraint: if two attempts race past the check, the loser's
     *    insert fails with DuplicateBetError and its charge is refunded.
     */
    async placeBet(gameId: string, team: string, stake: number) {
        if (!Number.isFinite(stake) || stake < MIN_STAKE || stake > MAX_STAKE) {
            throw new ToolError("invalid_stake", `Stake must be between $${MIN_STAKE} and $${MAX_STAKE}.`);
        }
        const amount = Math.round(stake * 100) / 100;
        const game = await this.requireGame(gameId);
        const pick = this.resolveTeam(game, team);
        if (this.started(game)) throw new ToolError("game_started", "This game has already started.");

        const existing = (await this.store.listPredictions(this.userId)).find((p) => p.bet_id === game.id);
        if (existing) {
            throw new ToolError(
                "duplicate_bet",
                `You've already bet $${existing.amount} on ${existing.predicted} in this game. Only one bet per game is allowed.`
            );
        }

        const user = await this.store.getUser(this.userId);
        if (!user?.stripe_id) {
            throw new ToolError("no_payment_method", "Add a payment method in your profile before betting.");
        }
        const card = await this.store.defaultCard(user.stripe_id);
        if (!card) throw new ToolError("no_payment_method", "No saved card found. Add one in your profile.");

        let chargeId: string;
        try {
            ({ id: chargeId } = await this.store.charge({
                customer: user.stripe_id,
                card,
                amountCents: Math.round(amount * 100),
                idempotencyKey: `bet:${this.userId}:${game.id}:${randomUUID()}`,
                metadata: { bet_id: game.id, user_id: this.userId, predicted: pick },
            }));
        } catch (e) {
            if (e instanceof CardError) throw new ToolError("card_declined", e.message);
            throw e;
        }

        try {
            await this.store.insertPrediction({
                from_user_id: this.userId,
                bet_id: game.id,
                predicted: pick,
                amount,
                created_at: this.store.now().toISOString(),
            });
        } catch (e) {
            await this.store.refund(chargeId).catch(() => undefined);
            if (e instanceof DuplicateBetError) {
                throw new ToolError("duplicate_bet", "You've already bet on this game. This charge was refunded.");
            }
            throw new ToolError("insert_failed", "Couldn't record your bet. You have not been charged.");
        }

        const odds = moneylineFor(game, pick);
        return {
            status: "placed",
            game_id: game.id,
            matchup: `${game.away_team} @ ${game.home_team}`,
            pick,
            stake: amount,
            american_odds: odds,
            potential_payout: odds === null ? null : payoutFor(amount, odds),
            charge_id: chargeId,
        };
    }
}
