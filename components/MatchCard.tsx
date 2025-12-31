import {betProfile} from "@/lib/actions/betting";
import Image from "next/image";

export default function BetCard({bet}: {bet: betProfile}) {

    return (
        <div className="card-container">
            <div className="card-swipe">
                <div className="card-content">
                    <div className="team-row">
                        <span className="team-name">{bet.home_team}</span>
                        <span className="team-odd">{bet.home_odd}</span>
                    </div>
                    <div className="team-row">
                        <span className="team-name">{bet.away_team}</span>
                        <span className="team-odd">{bet.away_odd}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}