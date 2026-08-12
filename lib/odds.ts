export function americanToDecimal(american: number): number {
    if (!Number.isFinite(american) || american === 0) {
        return 1;
    }

    return american > 0
        ? 1 + american / 100
        : 1 + 100 / Math.abs(american);
}

export function toMultiplier(american: number): number {
    return Math.floor(americanToDecimal(american) * 100) / 100;
}

export function formatAmericanOdds(odds: number | null): string {
    if (odds === null || !Number.isFinite(odds)) {
        return "—";
    }

    return odds > 0 ? `+${odds}` : `${odds}`;
}
