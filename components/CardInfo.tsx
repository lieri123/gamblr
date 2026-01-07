"use client";

import {useStripe, useElements, CardElement, PaymentElement} from "@stripe/react-stripe-js";
import { useEffect, useState } from "react";

interface CardFormProps {
    customerId: string; // this should be your Stripe customer ID
}

export default function CardForm({ customerId }: CardFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("/api/create-setup-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId }),
        })
            .then(res => res.json())
            .then(data => setClientSecret(data.clientSecret))
            .catch(err => console.error(err));
    }, [customerId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements || !clientSecret) return;

        setLoading(true);

        const cardElement = elements.getElement(CardElement);
        const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
            payment_method: { card: cardElement! },
        });

        if (error) {
            alert(error.message);
            console.error(error);
        } else {
            alert("Card saved successfully!");
            console.log("Saved payment method:", setupIntent.payment_method);
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {<PaymentElement/>}

        </form>
    );
}
