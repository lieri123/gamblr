"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import type { BetProfile } from "@/lib/types/bet";
import { formatAmericanOdds } from "@/lib/odds";

interface BetCardProps {
    bet: BetProfile;
    onSwipe: (team: string, odds: number) => void;
}

export default function MatchCard({ bet, onSwipe }: BetCardProps) {
    const x = useMotionValue(0);
    const opacity = useTransform(x, [-150, 0, 150], [0, 1, 0]);
    const rotate = useTransform(x, [-150, 150], [-18, 18]);

    const handleDragEnd = () => {
        const offset = x.get();

        if (offset > 50 && bet.home_odd !== null) {
            onSwipe(bet.home_team, bet.home_odd);
        } else if (offset < -50 && bet.away_odd !== null) {
            onSwipe(bet.away_team, bet.away_odd);
        }

        animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    };

    return (
        <motion.div
            className="card-container hover:cursor-grab active:cursor-grabbing"
            style={{ x, opacity, rotate }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
        >
            <div className="card-swipe">
                <div className="card-content">
                    <p className="card-meta">
                        {bet.sport_title} ·{" "}
                        {new Date(bet.commence_time).toLocaleString()}
                    </p>
                    <div className="team-row">
                        <span className="team-name">{bet.home_team} (H)</span>
                        <span className="team-odd">
                            {formatAmericanOdds(bet.home_odd)}
                        </span>
                    </div>
                    <div className="team-row">
                        <span className="team-name">{bet.away_team} (A)</span>
                        <span className="team-odd">
                            {formatAmericanOdds(bet.away_odd)}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
