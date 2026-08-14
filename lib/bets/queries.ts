import type { SupabaseClient } from "@supabase/supabase-js";
import type { BetProfile } from "@/lib/types/bet";

const MAX_BETS = 50;

interface FetchOptions {
    sports?: string[] | null;
}

export async function fetchOpenBets(
    supabase: SupabaseClient,
    userId: string,
    options: FetchOptions = {}
): Promise<BetProfile[]> {
    const { data: predictions, error: predictionsError } = await supabase
        .from("predictions")
        .select("bet_id")
        .eq("from_user_id", userId);

    if (predictionsError) {
        console.error("Supabase error (predictions):", predictionsError);
        throw new Error("Failed to load your existing bets.");
    }

    const predictedIds = (predictions ?? []).map((p) => p.bet_id as string);

    let betsQuery = supabase
        .from("bets")
        .select("id, sport_key, sport_title, home_team, away_team, commence_time")
        .gt("commence_time", new Date().toISOString())
        .order("commence_time", { ascending: true })
        .limit(MAX_BETS);

    if (options.sports && options.sports.length > 0) {
        betsQuery = betsQuery.in("sport_title", options.sports);
    }

    if (predictedIds.length > 0) {
        const notInFilter = predictedIds.map((id) => `"${id}"`).join(",");
        betsQuery = betsQuery.not("id", "in", `(${notInFilter})`);
    }

    const { data: bets, error: betsError } = await betsQuery;

    if (betsError) {
        console.error("Supabase error (bets):", betsError);
        throw new Error("Failed to load bets.");
    }

    if (!bets || bets.length === 0) {
        return [];
    }

    const betIds = bets.map((bet) => bet.id as string);

    const { data: markets, error: marketsError } = await supabase
        .from("markets")
        .select("id, bet_id, market_key")
        .in("bet_id", betIds);

    if (marketsError) {
        console.error("Supabase error (markets):", marketsError);
        throw new Error("Failed to load odds.");
    }

    const marketIds = (markets ?? []).map((market) => market.id);

    const { data: outcomes, error: outcomesError } =
        marketIds.length > 0
            ? await supabase
                  .from("outcomes")
                  .select("market_id, name, value")
                  .in("market_id", marketIds)
            : { data: [], error: null };

    if (outcomesError) {
        console.error("Supabase error (outcomes):", outcomesError);
        throw new Error("Failed to load odds.");
    }

    return bets.map((bet) => {
        const betMarkets = (markets ?? []).filter((m) => m.bet_id === bet.id);
        const market =
            betMarkets.find((m) => m.market_key === "h2h") ?? betMarkets[0];

        const marketOutcomes = (outcomes ?? []).filter(
            (outcome) => market !== undefined && outcome.market_id === market.id
        );

        const priceFor = (team: string): number | null => {
            const outcome = marketOutcomes.find((o) => o.name === team);
            const value = Number(outcome?.value);
            return Number.isFinite(value) ? value : null;
        };

        return {
            id: bet.id,
            sport_key: bet.sport_key,
            sport_title: bet.sport_title,
            home_team: bet.home_team,
            away_team: bet.away_team,
            commence_time: bet.commence_time,
            home_odd: priceFor(bet.home_team),
            away_odd: priceFor(bet.away_team),
        } satisfies BetProfile;
    });
}
