"use client"
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import Navbar from "../components/Navbar"
import { useRouter } from "next/navigation";
import {useEffect} from "react";

export default function Home() {
    const { user, signOut } = useAuth(); // get user state and signOut function
    const router = useRouter();


    useEffect(() => {
        if (user) {
            router.push("/bets/personalized");
        }
    }, [user, router]);


    const handleClick = () => {
        if (!user) {
            // If no user, redirect to login/signup page
            router.push("/auth");
            return;
        }

        // If user exists, sign them out
        signOut();
    };


    return (
        <div className="fixed inset-0 w-screen h-screen bg-gradient-to-b from-black/65 to-transparent z-50">
            <Navbar minimal={false} /> {/* Navbar will use useAuth to show login/sign out */}

            <div className="home flex flex-col items-center justify-center min-h-screen">
                <h1 className="primary-title text-4xl font-bold mb-6">Bet right</h1>

                <button
                    className="primary-button px-6 py-3 bg-pink-500 text-white rounded-lg"
                    onClick={handleClick}
                >
                    {user ? "Sign Out" : "Create Account"}
                </button>
            </div>
        </div>
    );
}
