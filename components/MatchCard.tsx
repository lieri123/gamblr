import {betProfile} from "@/lib/actions/bets";
import Image from "next/image";

export default function BetCard({bet}: {bet: betProfile}) {
    return (
        <div className = "relative w-full max-w-sm mx-auto">
            <div className="card-swipe aspect-[3/4] overflow-hidden">
                <div className="relative w-full h-full">
                    <div className="match-row">
                        <span className="team">{bet.home_team}</span>
                        <span className="odds">{bet.}</span>
                    </div>


                </div>
            </div>
        </div>
    )
}