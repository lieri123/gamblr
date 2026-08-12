"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import Navbar from "@/components/Navbar";

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.replace("/bets/personalized");
        }
    }, [user, loading, router]);

    return (
        <div className="min-h-full flex flex-col bg-gradient-to-b from-slate-900 to-slate-700">
            <Navbar />

            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                <h1 className="text-4xl font-bold mb-4 text-white">Bet right</h1>
                <p className="text-slate-300 mb-8 max-w-sm">
                    Swipe through upcoming games, back the side you like, and track
                    how your calls play out.
                </p>

                {!loading && !user && (
                    <button
                        className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors"
                        onClick={() => router.push("/auth")}
                    >
                        Create Account
                    </button>
                )}
            </div>
        </div>
    );
}
