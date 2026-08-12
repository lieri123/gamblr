"use client";

import BetFeed from "@/components/BetFeed";
import { getPotentialBets } from "@/lib/actions/betting";

export default function PersonalizedBetsPage() {
    return <BetFeed title="For You" loadBets={getPotentialBets} />;
}
