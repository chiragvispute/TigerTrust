export function deriveStripeIncomeFeatures(monthlyIncome: number, debt: number) {
const incomeVerified = monthlyIncome > 0;

let incomeBracket = "low";
if (monthlyIncome > 2000) incomeBracket = "mid";
if (monthlyIncome > 5000) incomeBracket = "high";

const incomeDebtRatio =
debt === 0 ? monthlyIncome : Number((monthlyIncome / debt).toFixed(2));

return {
incomeVerified,
incomeBracket,
incomeDebtRatio
};
}
