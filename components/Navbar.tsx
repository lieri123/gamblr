"use client";

import {useAuth} from "@/context/auth-context";

import Link from "next/link";
import {useState} from "react";



type NavbarProps = {
    minimal?: boolean;
};

export default function Navbar({minimal = false}:NavbarProps){
    const { signOut, user } = useAuth();

    return(
        <nav className="relative z-50 bg-slate-900 border-b border-gray-200/50 dark:border-gray-700/50">

            <div className="container mx-auto px-2">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center space-x-3">
                        <span className="text-xl font-bold text-white">
                          Gamblr
                        </span>
                    </Link>

                    {user && !minimal && (
                        <div className="flex items-center space-x-8 text-white">
                            <Link href="/bets/personal" className="hover:text-pink-400 transition">For You</Link>
                            <Link href="/bets" className="hover:text-pink-400 transition">Discover</Link>
                            <Link href="/profile" className="hover:text-pink-400 transition">Profile</Link>
                        </div>
                    )}

                    {!user && !minimal && (
                        <Link
                            href="/auth"
                            className="px-4 py-2 rounded-lg bg-pink-500 text-white"
                        >
                            Log in
                        </Link>
                    )}


                    {/* Show sign out when logged in */}
                    {user && !minimal && (
                        <button onClick={signOut} className="px-4 py-2 rounded-lg bg-red-500 text-white">

                            Sign Out
                        </button>
                    )}
                </div>

            </div>
        </nav>
    );
}