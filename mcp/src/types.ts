// Domain types shared by the MCP server, both storage backends, and the eval harness.
// They mirror the Supabase tables documented in the root README.

export interface Outcome {
    name: string;
    /** American odds for h2h; for spreads/totals this is the price. */
    price: number;
    /** Spread or total line (e.g. -4.5, 221.5). Absent for h2h. */
    point?: number;
}

export interface Market {
    key: "h2h" | "spreads" | "totals" | string;
    outcomes: Outcome[];
}

export interface Game {
    id: string;
    sport_key: string;
    sport_title: string;
    home_team: string;
    away_team: string;
    commence_time: string;
    markets: Market[];
}

export interface UserRecord {
    id: string;
    username: string;
    preferences: string[];
    stripe_id: string | null;
    /** IANA zone used to interpret "tonight"/"tomorrow". Not stored in Supabase yet; defaults to UTC. */
    timezone?: string;
}

export interface Prediction {
    id: string;
    from_user_id: string;
    bet_id: string;
    predicted: string;
    amount: number;
    created_at: string;
}

export interface Charge {
    id: string;
    customer: string;
    amount_cents: number;
    status: "succeeded" | "refunded";
    idempotency_key: string;
    metadata: Record<string, string>;
}

export class CardError extends Error {}

/**
 * Persistence + payments boundary. The service layer owns every business rule;
 * a store only reads and writes. Production uses Supabase + Stripe, evals use
 * an in-memory store with a fake clock and a fake card processor.
 */
export interface Store {
    now(): Date;
    listGames(opts: { includeStarted: boolean }): Promise<Game[]>;
    getGame(id: string): Promise<Game | null>;
    getUser(id: string): Promise<UserRecord | null>;
    setPreferences(userId: string, sports: string[]): Promise<void>;
    listPredictions(userId: string): Promise<Prediction[]>;
    insertPrediction(p: Omit<Prediction, "id">): Promise<Prediction>;
    /** Returns the default card id for a customer, or null if none saved. */
    defaultCard(customerId: string): Promise<string | null>;
    /** Charges a saved card. Throws CardError on decline. */
    charge(args: {
        customer: string;
        card: string;
        amountCents: number;
        idempotencyKey: string;
        metadata: Record<string, string>;
    }): Promise<{ id: string }>;
    refund(chargeId: string): Promise<void>;
}
