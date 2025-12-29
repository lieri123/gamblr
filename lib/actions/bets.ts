"use server";


import { createClient } from "../supabase/server";

export interface betProfile{
    id: string;
    sport_key: string;
    sport_title: string;
    home_team: string;
    away_team: string;
    commence_time: string;
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

    const currUserprefs = userPrefs.preferences as string [];
    const filteredBets = potentialBets?.filter((bets) =>{
        if(!currUserprefs || currUserprefs.length == 0){
            return true;
        }

        return currUserprefs.includes(bets.sport_title);
    }).map((bets) => ({
        id:bets.id,
        sport_key:bets.sport_key,
        sport_title:bets.sport_title,
        home_team:bets.home_team,
        away_team:bets.away_team,
        commence_time:bets.commence_time,
        })) || [];

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
            commence_time: otherbets.commence_time

        });
    }

    return betted;
}