"use server";


import { createClient } from "../supabase/server";

export interface betProfile{
    id: string;
    sport_key: string;
    sport_title: string;
    home_team: string;
    away_team: string;
    commence_time: string;
    home_odd: number;
    away_odd: number;
}
export async function getBets(): Promise<betProfile[]> {
    const supabase = await createClient();
    const{
        data:{user},
    } = await supabase.auth.getUser();

    if(!user){
        throw new Error("Not authenticated.");
    }

    const { data: predicted } = await supabase
        .from("predictions")
        .select("bet_id")
        .eq("from_user_id", user.id);

    const predictedIds = predicted?.map(p => p.bet_id) ?? [];


    let betsQuery = supabase
        .from("bets")
        .select("*")
        .limit(50);

    if (predictedIds.length > 0) {
        const notInFilter = predictedIds.map(id => `"${id}"`).join(",");
        betsQuery = betsQuery.not("id", "in", `(${notInFilter})`);
    }

    const { data: potentialBets, error } = await betsQuery;

    if (error){
        console.error("Supabase error:", error);
        throw new Error("failed to fetch potential bets");
    }


    const betIds = potentialBets.map(b => b.id);

    const { data: markets } = await supabase
        .from("markets")
        .select("id, bet_id")
        .in("bet_id", betIds);

    const marketIds = markets?.map(m => m.id) ?? [];

    const { data: outcomes } = await supabase
        .from("outcomes")
        .select("market_id, value")
        .in("market_id", marketIds);

    const finalBets: betProfile[] = potentialBets.map(bet => {
        const market = markets?.find(m => m.bet_id === bet.id);
        const marketOutcomes = outcomes?.filter(
            o => o.market_id === market?.id) ?? [];

        const homeOutcome = marketOutcomes[1]?.value;
        const awayOutcome = marketOutcomes[0]?.value;

        return {
            id: bet.id,
            sport_key: bet.sport_key,
            sport_title: bet.sport_title,
            home_team: bet.home_team,
            away_team: bet.away_team,
            commence_time: bet.commence_time,
            home_odd: homeOutcome ?? 1000,
            away_odd: awayOutcome ?? -1110,
        };

    });

    return finalBets;
}
