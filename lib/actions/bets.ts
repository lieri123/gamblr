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
export async function getPotentialBets(): Promise<betProfile[]> {
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

    const { data: potentialBets, error } = await supabase
        .from("bets")
        .select("*")
        .not("id", "in", predictedIds)
        .limit(50);

    if (error){
        throw new Error("failed to fetch potential bets");
    }

    const { data: userPrefs, error: prefsError } = await supabase
        .from("users")
        .select("preferences")
        .eq("id", user.id)
        .single();

    if (prefsError) {
        throw new Error("Failed to get user preferences");
    }

    const currUserprefs = userPrefs.preferences as string [] ?? [];

    const filteredBets = (potentialBets ?? []).filter(b =>
        currUserprefs.length === 0 || currUserprefs.includes(b.sport_title)
    );

    const betIds = filteredBets.map(b => b.id);

    const { data: markets } = await supabase
        .from("bet_markets")
        .select("id, bet_id")
        .in("bet_id", betIds);

    const marketIds = markets?.map(m => m.id) ?? [];

    const { data: outcomes } = await supabase
        .from("outcomes")
        .select("market_id, value")
        .in("market_id", marketIds);

    const finalBets: betProfile[] = filteredBets.map(bet => {
        const market = markets?.find(m => m.bet_id === bet.id);
        const marketOutcomes = outcomes?.filter(
            o => o.market_id === market?.id) ?? [];

        const homeOutcome = marketOutcomes[1];
        const awayOutcome = marketOutcomes[0];

        return {
            id: bet.id,
            sport_key: bet.sport_key,
            sport_title: bet.sport_title,
            home_team: bet.home_team,
            away_team: bet.away_team,
            commence_time: bet.commence_time,
            home_odd: homeOutcome?.value ?? 0,
            away_odd: awayOutcome?.value ?? 0,
        };
    });

    return filteredBets;
}

export async function beto(toBetId: string, predicted: string){
    const supabase = await createClient();
    const{
        data: {user},
    } = await supabase.auth.getUser();

    if(!user){
        throw new Error("Not authenticated.");
    }

    const {error:betError} = await supabase.from("predictions").insert({
        from_user_id:user.id,
        bet_id: toBetId,
        predicted: predicted,
        created_at:new Date()
    });

    if (betError){
        throw new Error("Failed to create a new bet");
    }
}

export async function getUserbets() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Not authenticated.");
    }

    const { data: bets, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("from_user_id", user.id);

    if (error) {
        throw new Error("Failed to fetch matches");
    }

    const betted: betProfile[] = [];

    for (const bet of bets || []) {

        const { data: otherbets, error: beterror } = await supabase
            .from("bets")
            .select("*")
            .eq("id", bet.id)
            .single();

        if (beterror) {
            continue;
        }
        betted.push({
            id: otherbets.id,
            sport_key: otherbets.sport_key,
            sport_title: otherbets.sport_title,
            home_team: otherbets.home_team,
            away_team: otherbets.away_team,
            commence_time: otherbets.commence_time,
            home_odd: 0,
            away_odd: 0
        });
    }

    return betted;
}