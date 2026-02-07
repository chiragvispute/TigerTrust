export interface WalletFeatures {
txCount: number
walletAgeDays: number
nftCount: number
tokenCount: number
successfulRepayments: number
defaults: number
humanVerified: boolean
hasVC: boolean
activeDaysLast30?: number
avgTxPerActiveDay?: number
activityRegularityScore?: number
}
