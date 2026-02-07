import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");

export async function getWalletTxStats(wallet: string) {
    const pubkey = new PublicKey(wallet);

    const sigs = await connection.getSignaturesForAddress(pubkey, {
        limit: 1000
    });

    const txCount = sigs.length;

    let walletAgeDays = 0;

    if (sigs.length > 0 && sigs[sigs.length - 1].blockTime) {
    const firstTime = sigs[sigs.length - 1].blockTime! * 1000;
    const ageMs = Date.now() - firstTime;
    walletAgeDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    }

    return {
        txCount,
        walletAgeDays
};
}

export async function getTokenAccountStats(wallet: string) {
const pubkey = new PublicKey(wallet);

const accounts = await connection.getParsedTokenAccountsByOwner(
pubkey,
{ programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
);

const tokenCount = accounts.value.length;

const nftLike = accounts.value.filter(a => {
const amt = a.account.data.parsed.info.tokenAmount;
return amt.decimals === 0 && amt.uiAmount === 1;
}).length;

return {
tokenCount,
nftCount: nftLike
};
}

export async function getActivityRegularity(wallet: string) {
const pubkey = new PublicKey(wallet);

const sigs = await connection.getSignaturesForAddress(pubkey, {
limit: 500
});

const now = Date.now();
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

const recent = sigs.filter(s =>
s.blockTime && (now - s.blockTime * 1000) <= THIRTY_DAYS
);

const days = new Set(
recent.map(s =>
new Date(s.blockTime! * 1000).toISOString().slice(0, 10)
)
);

const activeDaysLast30 = days.size;
const avgTxPerActiveDay =
activeDaysLast30 === 0 ? 0 : recent.length / activeDaysLast30;

// simple score model (0–100)
const activityRegularityScore = Math.min(
100,
activeDaysLast30 * 3 + avgTxPerActiveDay * 10
);

return {
activeDaysLast30,
avgTxPerActiveDay: Number(avgTxPerActiveDay.toFixed(2)),
activityRegularityScore: Math.round(activityRegularityScore)
};
}


