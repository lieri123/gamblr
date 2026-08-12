"use server";

import { requireUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { fetchOpenBets } from "@/lib/bets/queries";
import type { BetProfile } from "@/lib/types/bet";

const MIN_STAKE = 1;
const MAX_STAKE = 500;

export interface PlaceBetResult {
    success: boolean;
    error?: string;
}

export async function getBets(): Promise<BetProfile[]> {
    const { supabase, user } = await requireUser();

    return fetchOpenBets(supabase, user.id);
}

export async function getPotentialBets(): Promise<BetProfile[]> {
    const { supabase, user } = await requireUser();

    const { data: profile, error } = await supabase
        .from("users")
        .select("preferences")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Supabase error (preferences):", error);
        throw new Error("Failed to load your preferences.");
    }

    const preferences = Array.isArray(profile?.preferences)
        ? (profile.preferences as string[])
        : [];

    return fetchOpenBets(supabase, user.id, { sports: preferences });
}

export async function getUserBets(): Promise<BetProfile[]> {
    const { supabase, user } = await requireUser();

    const { data: predictions, error } = await supabase
        .from("predictions")
        .select("bet_id")
        .eq("from_user_id", user.id);

    if (error) {
        console.error("Supabase error (predictions):", error);
        throw new Error("Failed to load your bets.");
    }

    const betIds = (predictions ?? []).map((p) => p.bet_id as string);

    if (betIds.length === 0) {
        return [];
    }

    const { data: bets, error: betsError } = await supabase
        .from("bets")
        .select("id, sport_key, sport_title, home_team, away_team, commence_time")
        .in("id", betIds);

    if (betsError) {
        console.error("Supabase error (bets):", betsError);
        throw new Error("Failed to load your bets.");
    }

    return (bets ?? []).map((bet) => ({
        id: bet.id,
        sport_key: bet.sport_key,
        sport_title: bet.sport_title,
        home_team: bet.home_team,
        away_team: bet.away_team,
        commence_time: bet.commence_time,
        home_odd: null,
        away_odd: null,
    }));
}

export async function placeBet(
    betId: string,
    predicted: string,
    amount: number
): Promise<PlaceBetResult> {
    const { supabase, user } = await requireUser();

    if (!Number.isFinite(amount) || amount < MIN_STAKE || amount > MAX_STAKE) {
        return {
            success: false,
            error: `Stake must be between $${MIN_STAKE} and $${MAX_STAKE}.`,
        };
    }

    const stake = Math.round(amount * 100) / 100;
    const amountInCents = Math.round(stake * 100);

    const { data: bet, error: betError } = await supabase
        .from("bets")
        .select("id, home_team, away_team, commence_time")
        .eq("id", betId)
        .maybeSingle();

    if (betError || !bet) {
        return { success: false, error: "That bet is no longer available." };
    }

    if (predicted !== bet.home_team && predicted !== bet.away_team) {
        return { success: false, error: "Invalid team for this bet." };
    }

    if (new Date(bet.commence_time).getTime() <= Date.now()) {
        return { success: false, error: "This game has already started." };
    }

    const { data: existing } = await supabase
        .from("predictions")
        .select("id")
        .eq("from_user_id", user.id)
        .eq("bet_id", betId)
        .maybeSingle();

    if (existing) {
        return { success: false, error: "You've already bet on this game." };
    }

    const admin = getSupabaseAdmin();

    const { data: profile, error: profileError } = await admin
        .from("users")
        .select("stripe_id")
        .eq("id", user.id)
        .single();

    if (profileError || !profile?.stripe_id) {
        return {
            success: false,
            error: "Add a payment method in your profile before betting.",
        };
    }

    const stripe = getStripe();
    const customerId = profile.stripe_id as string;

    const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
    });

    const paymentMethod = paymentMethods.data[0];

    if (!paymentMethod) {
        return {
            success: false,
            error: "No saved card found. Add one in your profile.",
        };
    }

    let paymentIntentId: string;

    try {
        const paymentIntent = await stripe.paymentIntents.create(
            {
                amount: amountInCents,
                currency: "usd",
                customer: customerId,
                payment_method: paymentMethod.id,
                off_session: true,
                confirm: true,
                metadata: { bet_id: betId, user_id: user.id, predicted },
            },

            { idempotencyKey: `bet:${user.id}:${betId}` }
        );

        paymentIntentId = paymentIntent.id;
    } catch (error) {
        console.error("Stripe error:", error);
        const message =
            error instanceof Error ? error.message : "Card was declined.";
        return { success: false, error: message };
    }

    const { error: insertError } = await supabase.from("predictions").insert({
        from_user_id: user.id,
        bet_id: betId,
        predicted,
        amount: stake,
        created_at: new Date().toISOString(),
    });

    if (insertError) {
        console.error("Supabase error (prediction insert):", insertError);

        try {
            await stripe.refunds.create({ payment_intent: paymentIntentId });
        } catch (refundError) {
            console.error("Stripe refund failed:", refundError);
        }

        return { success: false, error: "Couldn't record your bet. You have not been charged." };
    }

    return { success: true };
}
