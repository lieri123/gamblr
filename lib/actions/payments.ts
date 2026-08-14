"use server";

import { requireUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";

export async function ensureStripeCustomer(): Promise<string> {
    const { user } = await requireUser();
    const admin = getSupabaseAdmin();

    const { data: profile, error } = await admin
        .from("users")
        .select("stripe_id")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Supabase error (stripe_id lookup):", error);
        throw new Error("Failed to load your billing profile.");
    }

    if (profile?.stripe_id) {
        return profile.stripe_id as string;
    }

    const customer = await getStripe().customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
    });

    const { error: updateError } = await admin
        .from("users")
        .update({ stripe_id: customer.id })
        .eq("id", user.id);

    if (updateError) {
        console.error("Supabase error (stripe_id update):", updateError);
        throw new Error("Failed to save your billing profile.");
    }

    return customer.id;
}

export async function createSetupIntent(): Promise<{ clientSecret: string }> {
    const customerId = await ensureStripeCustomer();

    const setupIntent = await getStripe().setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
    });

    if (!setupIntent.client_secret) {
        throw new Error("Stripe did not return a client secret.");
    }

    return { clientSecret: setupIntent.client_secret };
}

export async function hasSavedCard(): Promise<boolean> {
    const customerId = await ensureStripeCustomer();

    const paymentMethods = await getStripe().paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
    });

    return paymentMethods.data.length > 0;
}
