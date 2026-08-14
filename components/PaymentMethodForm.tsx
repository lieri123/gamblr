"use client";

import { useState } from "react";
import {
    Elements,
    PaymentElement,
    useElements,
    useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

interface PaymentMethodFormProps {
    clientSecret: string;
    onSaved?: () => void;
}

export default function PaymentMethodForm({
    clientSecret,
    onSaved,
}: PaymentMethodFormProps) {
    if (!stripePromise) {
        return (
            <p className="text-sm text-gray-500">
                Payments are not configured (missing
                NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).
            </p>
        );
    }

    if (!clientSecret) {
        return <p className="text-sm text-gray-500">Loading payment form…</p>;
    }

    return (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CardFields onSaved={onSaved} />
        </Elements>
    );
}

function CardFields({ onSaved }: { onSaved?: () => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    async function handleSave() {
        if (!stripe || !elements) return;

        setSaving(true);
        setError(null);

        const { error: submitError } = await elements.submit();

        if (submitError) {
            setError(submitError.message ?? "Please check your card details.");
            setSaving(false);
            return;
        }

        const { error: confirmError } = await stripe.confirmSetup({
            elements,
            redirect: "if_required",
        });

        if (confirmError) {
            setError(confirmError.message ?? "Failed to save card.");
        } else {
            setSaved(true);
            onSaved?.();
        }

        setSaving(false);
    }

    return (
        <div className="space-y-4">
            <PaymentElement />

            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && (
                <p className="text-sm text-green-600">Card saved successfully.</p>
            )}

            <button
                type="button"
                onClick={handleSave}
                disabled={!stripe || saving}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg disabled:opacity-50"
            >
                {saving ? "Saving…" : "Save card"}
            </button>
        </div>
    );
}
