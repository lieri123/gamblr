import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { Game, Market, Prediction, Store, UserRecord } from "../types.js";
import { CardError, DuplicateBetError } from "../types.js";

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required environment variable: ${name}`);
    return v;
}

/**
 * Production backend: the same Supabase tables and Stripe customer the Next.js
 * app uses. Uses the service-role key, so the MCP server must only run
 * locally on behalf of a single user (GAMBLR_USER_ID).
 */
export class SupabaseStore implements Store {
    private db: SupabaseClient;
    private stripe: Stripe;

    constructor() {
        this.db = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        this.stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    }

    now(): Date {
        return new Date();
    }

    private async withMarkets(rows: Omit<Game, "markets">[]): Promise<Game[]> {
        if (rows.length === 0) return [];
        const { data: markets, error } = await this.db
            .from("markets")
            .select("id, bet_id, market_key")
            .in("bet_id", rows.map((r) => r.id));
        if (error) throw error;
        const ids = (markets ?? []).map((m) => m.id);
        const { data: outcomes, error: oErr } = ids.length
            ? await this.db.from("outcomes").select("market_id, name, value").in("market_id", ids)
            : { data: [], error: null };
        if (oErr) throw oErr;
        return rows.map((r) => ({
            ...r,
            markets: (markets ?? [])
                .filter((m) => m.bet_id === r.id)
                .map(
                    (m): Market => ({
                        key: m.market_key,
                        outcomes: (outcomes ?? [])
                            .filter((o) => o.market_id === m.id)
                            .map((o) => ({ name: o.name, price: Number(o.value) })),
                    })
                ),
        }));
    }

    async listGames({ includeStarted }: { includeStarted: boolean }): Promise<Game[]> {
        let q = this.db
            .from("bets")
            .select("id, sport_key, sport_title, home_team, away_team, commence_time")
            .order("commence_time", { ascending: true })
            .limit(200);
        if (!includeStarted) q = q.gt("commence_time", this.now().toISOString());
        const { data, error } = await q;
        if (error) throw error;
        return this.withMarkets(data ?? []);
    }

    async getGame(id: string): Promise<Game | null> {
        const { data, error } = await this.db
            .from("bets")
            .select("id, sport_key, sport_title, home_team, away_team, commence_time")
            .eq("id", id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return (await this.withMarkets([data]))[0];
    }

    async getUser(id: string): Promise<UserRecord | null> {
        const { data, error } = await this.db
            .from("users")
            .select("id, username, preferences, stripe_id")
            .eq("id", id)
            .maybeSingle();
        if (error) throw error;
        return data ? { ...data, preferences: data.preferences ?? [] } : null;
    }

    async setPreferences(userId: string, sports: string[]): Promise<void> {
        const { error } = await this.db.from("users").update({ preferences: sports }).eq("id", userId);
        if (error) throw error;
    }

    async listPredictions(userId: string): Promise<Prediction[]> {
        const { data, error } = await this.db
            .from("predictions")
            .select("id, from_user_id, bet_id, predicted, amount, created_at")
            .eq("from_user_id", userId);
        if (error) throw error;
        return (data ?? []).map((p) => ({ ...p, amount: Number(p.amount) }));
    }

    async insertPrediction(p: Omit<Prediction, "id">): Promise<Prediction> {
        // Requires the predictions_user_bet_unique constraint (see mcp/README.md).
        const { data, error } = await this.db.from("predictions").insert(p).select().single();
        if (error?.code === "23505") throw new DuplicateBetError(error.message);
        if (error) throw error;
        return data;
    }

    async defaultCard(customerId: string): Promise<string | null> {
        const list = await this.stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
        return list.data[0]?.id ?? null;
    }

    async charge(args: {
        customer: string;
        card: string;
        amountCents: number;
        idempotencyKey: string;
        metadata: Record<string, string>;
    }): Promise<{ id: string }> {
        try {
            const pi = await this.stripe.paymentIntents.create(
                {
                    amount: args.amountCents,
                    currency: "usd",
                    customer: args.customer,
                    payment_method: args.card,
                    off_session: true,
                    confirm: true,
                    metadata: args.metadata,
                },
                { idempotencyKey: args.idempotencyKey }
            );
            return { id: pi.id };
        } catch (e) {
            if (e instanceof Stripe.errors.StripeCardError) throw new CardError(e.message);
            throw e;
        }
    }

    async refund(chargeId: string): Promise<void> {
        await this.stripe.refunds.create({ payment_intent: chargeId });
    }
}
