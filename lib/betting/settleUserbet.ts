import {supabase} from "@/lib/supabase/service";
import {getWinner} from "./winner";
import {createClient} from "@/lib/supabase/server";


interface OddsScore {
    name: string;
    score: string;
}

interface OddsGame {
    id: string;
    sport_key: string;
    sport_title: string;
    home_team: string;
    away_team: string;
    commence_time: string;
    completed: boolean;
    scores: OddsScore[];
    last_update: string;
}


export async function settleUserbet(bet: {
    prediction_id: string;
    predicted: string;
    amount: number;
    odds: number;
    game: OddsGame; }){

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Not authenticated.");
    }

    const winner = getWinner(bet.game);

    if(!winner){
        return { status: "pending" };
    }

    const diduserwin = winner == bet.predicted;


    try{
        await supabase.from("predictions").update({
            outcome: diduserwin,
            settled: true,
        }).eq("from_user_id", user.id);
    }

    catch (error:any){
        console.error("Error settling bet:", error.message);
        return { status: "error", message: error.message };
    }


}