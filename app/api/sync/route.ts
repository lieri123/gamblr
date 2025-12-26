import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/service";

type Outcome = {name: string; price: number};
type Market = {key: string; last_update: string; outcomes: Outcome[]};
type Bookmaker = {key: string; title: string; last_update: string; markets: Market[]};
type Bet = {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;
    bookmakers: Bookmaker[];
};



async function fetchBets(): Promise<Bet[]> {
    const res = await fetch(process.env.API_URL!);
    if (!res.ok) throw new Error("Failed to fetch bets");
    return res.json();
}

export async function GET(req: Request) {
    const secret = req.headers.get("x-sync-secret");
    if (secret !== process.env.SUPABASE_SECRET_KEY) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {

        const bets = await fetchBets();

        for (const bet of bets) {

            const { error: betErr } = await supabase.from("bets").upsert({
                id: bet.id,
                sport_key: bet.sport_key,
                sport_title: bet.sport_title,
                commence_time: bet.commence_time,
                home_team: bet.home_team,
                away_team: bet.away_team,
            });

            if (betErr) throw betErr;

            const bookmaker = bet.bookmakers?.[0];
            if (!bookmaker) continue;

            for (const market of bookmaker.markets ?? []) {

                // 4️⃣ INSERT MARKET + RETURN ID
                const { data: marketData, error: marketErr } = await supabase
                    .from("markets")
                    .insert({
                        bet_id: bet.id,
                        market_key: market.key,
                        last_update: market.last_update,
                    })
                    .select("id")
                    .single();

                if (marketErr) throw marketErr;
                if (!marketData) continue;

                const marketId = marketData.id;

                const outcomes = (market.outcomes ?? []).map(o => ({
                    market_id: marketId,
                    name: o.name,
                    value: o.price,
                }));

                if (outcomes.length > 0) {
                    const { error: outErr } = await supabase
                        .from("outcomes")
                        .insert(outcomes);

                    if (outErr) throw outErr;
                }
            }
        }

        return NextResponse.json({ success: true });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
        console.error("ERROR:", err);
        console.error("MESSAGE:", err?.message);
        console.error("DETAILS:", err?.cause ?? err?.error ?? err?.details);

        return NextResponse.json(
            { success: false, error: err?.message ?? "Unknown error" },
            { status: 500 }
        );
    }
}