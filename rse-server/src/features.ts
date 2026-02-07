import { WalletFeatures } from "./types";
import { getWalletTxStats } from "./solanaClient";
import { getTokenAccountStats } from "./solanaClient";
import { getActivityRegularity } from "./solanaClient";


export async function buildFeatures(wallet: string): Promise<WalletFeatures> {
const stats = await getWalletTxStats(wallet);
const assets = await getTokenAccountStats(wallet);
const regularity = await getActivityRegularity(wallet);


return {
txCount: stats.txCount,
walletAgeDays: stats.walletAgeDays,
nftCount: assets.nftCount,
successfulRepayments: 0,
defaults: 0,
humanVerified: false,
tokenCount: assets.tokenCount,
hasVC: assets.tokenCount > 0,
activeDaysLast30: regularity.activeDaysLast30,
avgTxPerActiveDay: regularity.avgTxPerActiveDay,
activityRegularityScore: regularity.activityRegularityScore,
};
}
