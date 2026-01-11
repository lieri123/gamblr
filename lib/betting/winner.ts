import {supabase} from "@/lib/supabase/service";

interface Score{
    name: string;
    score:string;
}

interface Game{
    home_team: string;
    away_team: string;
    scores: Score[];
}

export function getWinner(game:Game){

    if (!game.scores || game.scores.length < 2){
        return null;
    }

    const homeScore = Number(game.scores.find(s=>s.name == game.home_team)?.score??0);

    const awayScore = Number(game.scores.find(s=>s.name == game.away_team)?.score??0);

    if(homeScore > awayScore ){
        return game.home_team
    }
    if(awayScore > homeScore){
        return game.away_team;
    }
    return null;
}