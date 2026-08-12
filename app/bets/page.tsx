"use client";

import BetFeed from "@/components/BetFeed";
import { getBets } from "@/lib/actions/betting";

export default function DiscoverBetsPage() {
    return <BetFeed title="Discover Bets" loadBets={getBets} />;
}
