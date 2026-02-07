import { Router } from "express";
import { buildFeatures } from "./features";
import { computeTigerScore } from "./scoring";
import { getTier } from "./tier";
import { deriveStripeIncomeFeatures } from "./stripeOracle";


const router = Router();

router.post("/risk/recalculate", async (req, res) => {
const { wallet, monthlyIncome = 0, debt = 0 } = req.body;


if (!wallet) {
return res.status(400).json({ error: "wallet required" });
}

try {
const baseFeatures = await buildFeatures(wallet);
const stripeFeatures = deriveStripeIncomeFeatures(monthlyIncome, debt);

const features = {
  ...baseFeatures,
  ...stripeFeatures
};
const score = computeTigerScore(features);
const tier = getTier(score);


res.json({
  wallet,
  score,
  tier,
  features_used: features
});

}
catch (e: any) {
console.log("========== RSE ERROR ==========");
console.log(e?.response?.data || e.message || e);
console.log("================================");

res.status(500).json({
error: "failed to read wallet data",
detail: e?.message
});
}
});


export default router;