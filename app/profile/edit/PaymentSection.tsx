"use client";

import {PaymentElement, useElements, useStripe} from "@stripe/react-stripe-js";
import {useState} from "react";


export default function PaymentSection() {
    const stripe = useStripe();
    const elements = useElements();
    const [saving, setSaving] = useState(false);


    async function confirmCard() {
        if (!stripe || !elements) return;

        setSaving(true);
        try {
            const { error } = await stripe.confirmSetup({
                elements,
                redirect: "if_required",
            });

            if (error) {
                console.error(error.message);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mt-8">
            <PaymentElement />
            <button
                type="button"
                onClick={confirmCard}
                disabled={!stripe || !elements || saving}
                className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {saving ? "Saving..." : "Save Payment Method"}
            </button>

        </div>
    );
}
