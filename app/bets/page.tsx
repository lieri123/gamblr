"use client";
import {getPotentialBets, beto} from "@/lib/actions/betting";
import { useEffect, useState} from "react";
import { UserProfile} from "@/app/profile/page";
import { betProfile} from "@/lib/actions/betting";
import { useRouter } from "next/navigation";
import MatchCard from "@/components/MatchCard";
import MatchButtons from "@/components/MatchButtons";
import { useSwipeable } from "react-swipeable";

export default function MatchesPage() {
    const [potentialBets, setPotentialBets] = useState<betProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [bettedon, setbettedon] = useState<betProfile[]>([]);

    const router = useRouter();

    useEffect(() => {
        async function loadBets() {
            try{
                const potentialBets = await getPotentialBets();
                setPotentialBets(potentialBets);
            }catch(error){
                console.error(error);
            }finally {
                setLoading(false);
            }
        }

        loadBets();
    }, []);

    async function handleBetting(predictedteam:string){
        if(currentIndex < potentialBets.length){
            const bettedon = potentialBets[currentIndex];

            try{
                const result = await beto(bettedon.id, predictedteam);
                setCurrentIndex((prev) => prev + 1);
            }
            catch (error){
                console.error(error);
            }

        }
    }

    function handlePass(){
        if(currentIndex < potentialBets.length- 1){
            setCurrentIndex((prev) => prev + 1);
        }
    }

    const currPotentialBets = potentialBets[currentIndex];

    const swipeHandlers = useSwipeable({
        onSwipedRight: ()=> handleBetting(currPotentialBets.home_team),
        onSwipedLeft: ()=> handleBetting(currPotentialBets.away_team),
        onSwipedUp: handlePass,
        trackMouse: true,
        preventScrollOnSwipe: true,
    });

    if (loading){
        return (
            <div className="h-full bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                        Finding bets for you...
                    </p>
                </div>
            </div>
        );
    }

    if(currentIndex >= potentialBets.length){
        return(
            <div className="h-full bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="w-24 h-24 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">🎲</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        No more bets to show
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Check back later for new bets, or try adjusting your preferences!
                    </p>
                    <button
                        onClick={() => setCurrentIndex(0)}
                        className="bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 px-6 rounded-full hover:from-pink-600 hover:to-red-600 transition-all duration-200"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        );
    }


    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-8">
                <header className="mb-8">
                    <div className="flex items-center justify-between mb-4" {...swipeHandlers}>
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-gray-700/50 transition-colors duration-200"
                            title="Go back"
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
                            Discover Bets
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {currentIndex + 1} of {potentialBets.length} profiles
                        </p>
                    </div>
                </header>

                <div className="max-w-md mx-auto">
                    <MatchCard bet={currPotentialBets} />
                    <div className="mt-8">
                        <MatchButtons onRight={() => beto(currPotentialBets.id, currPotentialBets.home_team)} onLeft={() => beto(currPotentialBets.id, currPotentialBets.away_team)}
                                      onPass={handlePass} />
                    </div>
                </div>
            </div>
        </div>
    );

}