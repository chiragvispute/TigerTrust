import { WalletFeatures } from "./types";

export function computeTigerScore(f: WalletFeatures): number {
    let score = 300;

    if (f.humanVerified) score += 80;
    if (f.walletAgeDays > 180) score += 40;
    if (f.txCount > 100) score += 40;
    if (f.nftCount > 0) score += 20;

    score += f.successfulRepayments * 60;
    score -= f.defaults * 120;

    if (f.hasVC) score += 30;

    if (score < 0) score = 0;
    if (score > 1000) score = 1000;

    if (f.activityRegularityScore && f.activityRegularityScore > 40) {
        score += 40;
    }


    return score;
}
