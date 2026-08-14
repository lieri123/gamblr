"use client";

import { useState } from "react";
import { toMultiplier } from "@/lib/odds";

const MIN_STAKE = 1;
const MAX_STAKE = 500;

type BetModalProps = {
    team: string;
    odds: number;
    onClose: () => void;
    onConfirm: (amount: number) => Promise<{ success: boolean; error?: string }>;
};

export default function BetModal({
    team,
    odds,
    onClose,
    onConfirm,
}: BetModalProps) {
    const [amount, setAmount] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const multiplier = toMultiplier(odds);

    const stake = Number.parseFloat(amount);
    const stakeIsValid =
        Number.isFinite(stake) && stake >= MIN_STAKE && stake <= MAX_STAKE;
    const payout = stakeIsValid ? (stake * multiplier).toFixed(2) : "0.00";

    const handleSubmit = async () => {
        if (!stakeIsValid || submitting) {
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const result = await onConfirm(stake);

            if (!result.success) {
                setError(result.error ?? "Couldn't place that bet.");
            }
        } catch (err) {
            console.error(err);
            setError("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-xl shadow-xl w-80 p-4">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-700">Predicting:</p>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <h2 className="text-lg font-bold text-gray-900 text-center mb-3">
                    {team}
                </h2>

                <div className="flex items-center border rounded-lg overflow-hidden mb-3">
                    <span className="px-3 bg-gray-100 text-gray-600 font-semibold">
                        $
                    </span>
                    <input
                        type="number"
                        inputMode="decimal"
                        min={MIN_STAKE}
                        max={MAX_STAKE}
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-2 outline-none text-gray-900"
                        placeholder="Stake"
                    />
                    <span className="px-3 text-green-600 font-semibold">
                        ×{multiplier}
                    </span>
                </div>

                <p className="font-semibold text-gray-800 mb-2">
                    Payout: <span className="text-green-600">${payout}</span>
                </p>

                {amount !== "" && !stakeIsValid && (
                    <p className="text-sm text-red-600 mb-2">
                        Enter a stake between ${MIN_STAKE} and ${MAX_STAKE}.
                    </p>
                )}

                {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={!stakeIsValid || submitting}
                    className="w-full py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? "Placing bet…" : "Place Bet"}
                </button>
            </div>
        </div>
    );
}
