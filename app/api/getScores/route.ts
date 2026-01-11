import { NextResponse } from "next/server";
import { getUserbets} from "@/lib/actions/betting";
const BASE_URL = "https://api.the-odds-api.com/v4/sports";
const ODDS_API_KEY = process.env.ODDS_API_KEY;
import {betProfile} from "@/lib/actions/betting";

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

interface EnrichedBet extends betProfile {
    completed: boolean;
    scores: OddsScore[] | null;
    last_update: string | null;
}

export async function GET(req: Request){
    try{
        const bets = await getUserbets();

        const betsBySport = new Map<string, typeof bets>();

        for (const bet of bets) {
            if (bet.outcome == "In Progress"){
                if (!betsBySport.has(bet.sport_key)) {
                    betsBySport.set(bet.sport_key, []);
                }
                betsBySport.get(bet.sport_key)!.push(bet);
            }
        }

        const results: EnrichedBet[] = [];

        for (const [sport, sportBets] of betsBySport.entries()) {

            const eventIds = sportBets
                .map(b => b.event_id)
                .join(",");

            const res = await fetch(
                `${BASE_URL}/${sport}/scores/?apiKey=${ODDS_API_KEY}&eventIds=${eventIds}`,
                { cache: "no-store" }
            );

            if (!res.ok) continue;

            const games = await res.json();

            const gameMap = new Map<string, OddsGame>(
                games.map((g: OddsGame) => [g.id, g])
            );

            for (const bet of sportBets) {
                const game = gameMap.get(bet.event_id);

                if (game?.completed) {
                    results.push({
                        ...bet,
                        completed: game.completed,
                        scores: game.scores ?? null,
                        last_update: game.last_update ?? null,
                    });
                }
            }
        }
        return NextResponse.json(results);
    }
    catch (error: unknown) {
        console.error("Scores API error:", error);

        const message = error instanceof Error ? error.message : String(error);

        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}