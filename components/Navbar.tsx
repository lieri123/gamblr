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

            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center space-x-3">
                        <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                          Gamblr
                        </span>
                    </Link>
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