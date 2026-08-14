"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";

type NavbarProps = {
    minimal?: boolean;
};

export default function Navbar({ minimal = false }: NavbarProps) {
    const { signOut, user, loading } = useAuth();

    return (
        <nav className="relative z-50 bg-slate-900 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="container mx-auto px-2">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center space-x-3">
                        <span className="text-xl font-bold text-white">Gamblr</span>
                    </Link>

                    {!minimal && !loading && user && (
                        <>
                            <div className="hidden sm:flex items-center space-x-8 text-white">
                                <Link
                                    href="/bets/personalized"
                                    className="hover:text-pink-400 transition"
                                >
                                    For You
                                </Link>
                                <Link
                                    href="/bets"
                                    className="hover:text-pink-400 transition"
                                >
                                    Discover
                                </Link>
                                <Link
                                    href="/profile"
                                    className="hover:text-pink-400 transition"
                                >
                                    Profile
                                </Link>
                            </div>

                            <button
                                onClick={signOut}
                                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                            >
                                Sign Out
                            </button>
                        </>
                    )}

                    {!minimal && !loading && !user && (
                        <Link
                            href="/auth"
                            className="px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white transition-colors"
                        >
                            Log in
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
