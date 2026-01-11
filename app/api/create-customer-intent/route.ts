"use server";

import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request){

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const supabase = await createClient();
    const{
        data:{user},
    } = await supabase.auth.getUser();

    if (!user) {

        return new Response("Not authenticated", { status: 401 });
    }

    const userId = user.id;
    const email = user.email;

    const { data: stripe_customer, error } = await supabase
        .from("users")
        .select("stripe_id")
        .eq("id", userId)
        .single();


    if (error){
        console.error("Supabase error:", error);

        throw new Error("Failed to get stripe customer");
    }

    let stripeId = stripe_customer?.stripe_id;


    if (!stripeId) {
        const customer = await stripe.customers.create({email});

        const {error: updateError } = await supabase.from("users").update({
            "stripe_id": customer.id
        }).eq("id", userId);

        if(updateError ){
            console.error("Supabase error:", updateError );

            throw new Error("Failed to update users stripe id");
        }

        stripeId = customer.id;
    }
    return new Response(JSON.stringify({ stripe_id: stripeId }), { status: 200 });

}