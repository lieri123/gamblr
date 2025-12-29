import {betProfile} from "@/lib/actions/bets";
import Image from "next/image";

export default function BetCard({bet}: {bet: betProfile}) {
    return (
        <div className = "relative w-full max-w-sm mx-auto">
            <div className="card-swipe aspect-[3/4] overflow-hidden">
                <div className="relative w-full h-full">
                    <div className="flex justify-between items-center py-2 px-3 bg-gray-100 rounded-lg mb-2">
                        <span className="font-semibold text-gray-800">{bet.home_team}</span>
                        <span className="font-bold text-blue-600">{bet.home_odd}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 px-3 bg-gray-100 rounded-lg">
                        <span className="font-semibold text-gray-800">{bet.away_team}</span>
                        <span className="font-bold text-blue-600">{bet.away_odd}</span>
                    </div>

                </div>
            </div>
        </div>
    );
}