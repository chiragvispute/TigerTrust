import axios from "axios";

const HELIUS_KEY = process.env.HELIUS_KEY!;

const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;


export async function getHeliusAssets(wallet: string) {
const res = await axios.post(
RPC_URL,
{
jsonrpc: "2.0",
id: "rse",
method: "getAssetsByOwner",
params: {
ownerAddress: wallet,
page: 1,
limit: 50
}
},
{
timeout: 10000,
headers: {
"Content-Type": "application/json"
}
}
);


const items = res.data.result?.items || [];

const nftCount = items.filter((i: any) =>
i.interface === "V1_NFT" || i.interface === "V2_NFT"
).length;

return {
tokenCount: items.length,
nftCount
};
}
