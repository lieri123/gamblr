"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MatchCard from "@/components/MatchCard";
import MatchButtons from "@/components/MatchButtons";
import BetModal from "@/components/BetModal";
import Navbar from "@/components/Navbar";
import { placeBet } from "@/lib/actions/betting";
import type { BetProfile } from "@/lib/types/bet";

interface BetFeedProps {
    title: string;
    loadBets: () => Promise<BetProfile[]>;
}

export default function BetFeed({ title, loadBets }: BetFeedProps) {
    const [bets, setBets] = useState<BetProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selection, setSelection] = useState<{
        team: string;
        odds: number;
    } | null>(null);

    const router = useRouter();

    const refresh = useCallback(async () => {
        setLoading(true);
        setLoadError(null);

        try {
            const next = await loadBets();
            setBets(next);
            setCurrentIndex(0);
        } catch (error) {
            console.error(error);
            setLoadError(
                error instanceof Error ? error.message : "Failed to load bets."
            );
        } finally {
            setLoading(false);
        }
    }, [loadBets]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const currentBet: BetProfile | undefined = bets[currentIndex];

    function handleSelect(team: string, odds: number) {
        setSelection({ team, odds });
    }

    function handlePass() {
        setCurrentIndex((prev) => Math.min(prev + 1, bets.length));
    }

    async function handleConfirm(amount: number) {
        if (!selection || !currentBet) {
            return { success: false, error: "Nothing selected." };
        }

        const result = await placeBet(currentBet.id, selection.team, amount);

        if (result.success) {
            setSelection(null);
            setCurrentIndex((prev) => prev + 1);
        }

        return result;
    }

    if (loading) {
        return (
            <Shell>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto" />
                        <p className="mt-4 text-gray-600 dark:text-gray-400">
                            Finding bets for you…
                        </p>
                    </div>
                </div>
            </Shell>
        );
    }

    if (loadError) {
        return (
            <Shell>
                <EmptyState
                    icon="⚠️"
                    heading="Couldn't load bets"
                    body={loadError}
                    actionLabel="Try again"
                    onAction={refresh}
                />
            </Shell>
        );
    }

    if (!currentBet) {
        return (
            <Shell>
                <EmptyState
                    icon="🎲"
                    heading="No more bets to show"
                    body="Check back later for new bets, or try adjusting your preferences."
                    actionLabel="Refresh"
                    onAction={refresh}
                />
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="container mx-auto px-4 py-8">
                <header className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-gray-700/50 transition-colors duration-200"
                            title="Go back"
                            aria-label="Go back"
                        >
                            <svg
                                className="w-6 h-6 text-gray-700 dark:text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>
                        <div className="flex-1" />
                    </div>

                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {title}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {currentIndex + 1} of {bets.length}
                        </p>
                    </div>
                </header>

                <div className="max-w-md mx-auto">
                    <MatchCard bet={currentBet} onSwipe={handleSelect} />

                    <div className="mt-8">
                        <MatchButtons
                            onRight={() =>
                                currentBet.home_odd !== null &&
                                handleSelect(currentBet.home_team, currentBet.home_odd)
                            }
                            onLeft={() =>
                                currentBet.away_odd !== null &&
                                handleSelect(currentBet.away_team, currentBet.away_odd)
                            }
                            onPass={handlePass}
                            disableRight={currentBet.home_odd === null}
                            disableLeft={currentBet.away_odd === null}
                        />

                        {selection && (
                            <BetModal
                                team={selection.team}
                                odds={selection.odds}
                                onClose={() => setSelection(null)}
                                onConfirm={handleConfirm}
                            />
                        )}
                    </div>
                </div>
            </div>
        </Shell>
    );
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-full flex flex-col bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
            <Navbar />
            {children}
        </div>
    );
}

function EmptyState({
    icon,
    heading,
    body,
    actionLabel,
    onAction,
}: {
    icon: string;
    heading: string;
    body: string;
    actionLabel: string;
    onAction: () => void;
}) {
    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-8">
                <div className="w-24 h-24 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">{icon}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {heading}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{body}</p>
                <button
                    onClick={onAction}
                    className="bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 px-6 rounded-full hover:from-pink-600 hover:to-red-600 transition-all duration-200"
                >
                    {actionLabel}
                </button>
            </div>
        </div>
    );
}
