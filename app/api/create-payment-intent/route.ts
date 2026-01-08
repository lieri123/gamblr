import {NextRequest, NextResponse} from "next/server";
import Stripe from "stripe";
import {supabase} from "@/lib/supabase/service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST( request: NextRequest ) {
    try{
        const { amount } = await request.json();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("users")
            .select("stripe_id")
            .eq("id", user.id)
            .single();

        if (error || !data?.stripe_id) {
            return NextResponse.json(
                { error: "Stripe customer not found" },
            );
        }

        const customerId = data.stripe_id;

        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
        });

        if (paymentMethods.data.length === 0) {
            return NextResponse.json(
                { error: "No saved card found" },
            );
        }

        const paymentMethodId = paymentMethods.data[0].id;


        const paymentIntent = await stripe.paymentIntents.create({
            amount:amount,
            currency:"usd",
            customer: customerId,
            payment_method: paymentMethodId,
            off_session:true,
            confirm:true,
        });



        return NextResponse.json({clientSecret:paymentIntent.client_secret})
    }
    catch(error){
        console.error("Internal error:", error);

        return NextResponse.json({
            error:`Internal error : ${error}`},
            {status:500}
        );
    }
}