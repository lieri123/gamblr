import { randomUUID } from "node:crypto";
import type { Charge, Game, Prediction, Store, UserRecord } from "../types.js";
import { CardError, DuplicateBetError } from "../types.js";

export interface World {
    now: string;
    games: Game[];
    users: UserRecord[];
    predictions: Prediction[];
    /** customer id -> saved card id. A card id starting with "card_declined" always declines. */
    cards: Record<string, string>;
}

/**
 * Hermetic store for tests and evals: fixed clock, fake card processor, and a
 * full charge ledger so graders can check money movement, not just DB rows.
 */
export class MemoryStore implements Store {
    readonly world: World;
    readonly charges: Charge[] = [];
    /** Every idempotency key Stripe has seen, with its first request and outcome. */
    private keys = new Map<string, { amountCents: number; card: string; result: { id: string } | CardError }>();

    constructor(world: World) {
        this.world = structuredClone(world);
    }

    now(): Date {
        return new Date(this.world.now);
    }

    async listGames({ includeStarted }: { includeStarted: boolean }): Promise<Game[]> {
        const now = this.now().getTime();
        return structuredClone(
            this.world.games.filter((g) => includeStarted || Date.parse(g.commence_time) > now)
        );
    }

    async getGame(id: string): Promise<Game | null> {
        const g = this.world.games.find((x) => x.id === id);
        return g ? structuredClone(g) : null;
    }

    async getUser(id: string): Promise<UserRecord | null> {
        const u = this.world.users.find((x) => x.id === id);
        return u ? structuredClone(u) : null;
    }

    async setPreferences(userId: string, sports: string[]): Promise<void> {
        const u = this.world.users.find((x) => x.id === userId);
        if (!u) throw new Error("user not found");
        u.preferences = [...sports];
    }

    async listPredictions(userId: string): Promise<Prediction[]> {
        return structuredClone(this.world.predictions.filter((p) => p.from_user_id === userId));
    }

    async insertPrediction(p: Omit<Prediction, "id">): Promise<Prediction> {
        if (this.world.predictions.some((x) => x.from_user_id === p.from_user_id && x.bet_id === p.bet_id)) {
            throw new DuplicateBetError("unique violation: predictions_user_bet_unique");
        }
        const row = { id: randomUUID(), ...p };
        this.world.predictions.push(row);
        return structuredClone(row);
    }

    async defaultCard(customerId: string): Promise<string | null> {
        return this.world.cards[customerId] ?? null;
    }

    async charge(args: {
        customer: string;
        card: string;
        amountCents: number;
        idempotencyKey: string;
        metadata: Record<string, string>;
    }): Promise<{ id: string }> {
        // Like Stripe: a reused key replays the first outcome (declines included),
        // and a reused key with different parameters is rejected.
        const prior = this.keys.get(args.idempotencyKey);
        if (prior) {
            if (prior.amountCents !== args.amountCents || prior.card !== args.card) {
                throw new Error("Keys for idempotent requests can only be used with the same parameters they were first used with.");
            }
            if (prior.result instanceof CardError) throw prior.result;
            return prior.result;
        }
        if (args.card.startsWith("card_declined")) {
            const err = new CardError("Your card was declined.");
            this.keys.set(args.idempotencyKey, { amountCents: args.amountCents, card: args.card, result: err });
            throw err;
        }
        const id = `ch_${this.charges.length + 1}`;
        this.charges.push({
            id,
            customer: args.customer,
            amount_cents: args.amountCents,
            status: "succeeded",
            idempotency_key: args.idempotencyKey,
            metadata: args.metadata,
        });
        this.keys.set(args.idempotencyKey, { amountCents: args.amountCents, card: args.card, result: { id } });
        return { id };
    }

    async refund(chargeId: string): Promise<void> {
        const c = this.charges.find((x) => x.id === chargeId);
        if (c) c.status = "refunded";
    }
}
