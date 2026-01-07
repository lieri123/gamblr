import { NextRequest } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { customerId } = body;

        if (!customerId) {
            return new Response(
                JSON.stringify({ error: "Missing customerId" }),
                { status: 400 }
            );
        }

        const setupIntent = await stripe.setupIntents.create({
            customer: customerId,
            payment_method_types: ["card"],
        });

        return new Response(
            JSON.stringify({ clientSecret: setupIntent.client_secret }),
            { status: 200 }
        );
    } catch (err) {
        console.error("Error creating SetupIntent:", err);
        return new Response(
            JSON.stringify({ error: "Failed to create SetupIntent" }),
            { status: 500 }
        );
    }
}
