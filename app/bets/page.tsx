"use client";
import {getBets} from "@/lib/actions/nonpersonalbets";
import { beto } from "@/lib/actions/betting";
import { useEffect, useState} from "react";
import { betProfile } from "@/lib/actions/betting";
import { useRouter } from "next/navigation";
import MatchCard from "@/components/MatchCard";
import MatchButtons from "@/components/MatchButtons";
import { useSwipeable } from "react-swipeable";
import BetModal from "@/components/BetModal";
import Navbar from "@/components/Navbar";

export default function MatchesPage() {
    const [potentialBets, setPotentialBets] = useState<betProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showBetModal, setShowBetModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [betOdds, setbetOdds] = useState<number>(0);


    const router = useRouter();

    useEffect(() => {
        async function loadBets() {
            try{
                const potentialBets = await getBets();
                setPotentialBets(potentialBets);
            }catch(error){
                console.error(error);
            }finally {
                setLoading(false);
            }
        }

        loadBets();
    }, []);

    async function handleBetting(predictedteam:string, odds:number) {

        setSelectedTeam(predictedteam);
        setbetOdds(odds);
        setShowBetModal(true);

    }

    function handleCloseModal() {
        setShowBetModal(false);
        setSelectedTeam(null);
    }

    async function handleConfirmBet(amount: number) {
        if (!selectedTeam) return;

        if(currentIndex < potentialBets.length){
            const bettedon = potentialBets[currentIndex];

            try{
                const result = await beto(bettedon.id, selectedTeam, amount);
                setCurrentIndex((prev) => prev + 1);
            }
            catch (error){
                console.error(error);
            }finally {
                handleCloseModal();
            }

        }
    }


    async function refreshBets() {
        setLoading(true);
        try{
            const bets = await getBets();
            setPotentialBets(bets);
            setCurrentIndex(0);
        } finally {
            setLoading(false);
        }
    }

    function handlePass(){
        if(currentIndex < potentialBets.length){
            setCurrentIndex((prev) => prev + 1);
        }
    }

    const currPotentialBets = potentialBets[currentIndex];

    console.log(currPotentialBets);

    const swipeHandlers = useSwipeable({
        onSwipedRight: ()=> handleBetting(currPotentialBets.home_team, currPotentialBets.home_odd),
        onSwipedLeft: ()=> handleBetting(currPotentialBets.away_team, currPotentialBets.away_odd),
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
                <Navbar minimal={false} /> {/* Navbar will use useAuth to show login/sign out */}
                <button
                    onClick={() => router.back()}
                    className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/20 dark:hover:bg-gray-700/50 transition-colors duration-200"
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
                        onClick={() => refreshBets()}
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
            <Navbar minimal={false} /> {/* Navbar will use useAuth to show login/sign out */}
            <div className="container mx-auto px-4 py-8">
                <header className="mb-8">
                    <div className="flex items-center justify-between mb-4" >
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

                <div className="max-w-md mx-auto" {...swipeHandlers}>
                    <MatchCard bet={currPotentialBets} />
                    <div className="mt-8">
                        <MatchButtons onRight={()=>handleBetting(currPotentialBets.home_team,currPotentialBets.home_odd)} onLeft={() => handleBetting(currPotentialBets.away_team, currPotentialBets.away_odd)}
                                      onPass={handlePass} />

                        {showBetModal && selectedTeam && (
                            <BetModal
                                team={selectedTeam}
                                odds={betOdds}  // or use home/away odds if needed
                                onClose={handleCloseModal}
                                onConfirm={handleConfirmBet}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

}