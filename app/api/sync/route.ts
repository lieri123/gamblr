import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/service";
import { requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

type Outcome = { name: string; price: number };
type Market = { key: string; last_update: string; outcomes: Outcome[] };
type Bookmaker = {
    key: string;
    title: string;
    last_update: string;
    markets: Market[];
};
type Bet = {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;
    bookmakers: Bookmaker[];
};

function secretsMatch(provided: string | null, expected: string): boolean {
    if (!provided) {
        return false;
    }

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);

    return a.length === b.length && timingSafeEqual(a, b);
}

async function fetchBets(): Promise<Bet[]> {
    const res = await fetch(requireEnv("ODDS_API_URL"), { cache: "no-store" });

    if (!res.ok) {
        throw new Error(`Odds API responded ${res.status}`);
    }

    return res.json();
}

export async function GET(req: Request) {
    if (!secretsMatch(req.headers.get("x-sync-secret"), requireEnv("SYNC_SECRET"))) {
        return new Response("Unauthorized", { status: 401 });
    }

    const supabase = getSupabaseAdmin();

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

            const { data: staleMarkets, error: staleErr } = await supabase
                .from("markets")
                .select("id")
                .eq("bet_id", bet.id);

            if (staleErr) throw staleErr;

            const staleIds = (staleMarkets ?? []).map((m) => m.id);

            if (staleIds.length > 0) {
                const { error: outcomeDeleteErr } = await supabase
                    .from("outcomes")
                    .delete()
                    .in("market_id", staleIds);

                if (outcomeDeleteErr) throw outcomeDeleteErr;

                const { error: marketDeleteErr } = await supabase
                    .from("markets")
                    .delete()
                    .in("id", staleIds);

                if (marketDeleteErr) throw marketDeleteErr;
            }

            for (const market of bookmaker.markets ?? []) {
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

                const outcomes = (market.outcomes ?? []).map((o) => ({
                    market_id: marketData.id,
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

        return NextResponse.json({ success: true, synced: bets.length });
    } catch (err) {
        console.error("Sync failed:", err);

        return NextResponse.json(
            {
                success: false,
                error: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
