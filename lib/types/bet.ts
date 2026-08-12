export interface BetProfile {
    id: string;
    sport_key: string;
    sport_title: string;
    home_team: string;
    away_team: string;
    commence_time: string;

    home_odd: number | null;

    away_odd: number | null;
}
