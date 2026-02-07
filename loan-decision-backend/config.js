const LOAN_TIERS = [
  {
    level: 0, // Base level, for new users or low TigerScore
    minTigerScore: 0,
    maxLoanLimit: 50, // USDC
    baseInterestRate: 15, // Percentage
    maxDtiRatio: 0.2, // Max Debt-to-Verified-Income ratio
    loanApplicationVelocityLimit: 3, // Max applications in last 24 hours
    description: "Entry-level micro-loan. Build your trust!"
  },
  {
    level: 1,
    minTigerScore: 200,
    maxLoanLimit: 150,
    baseInterestRate: 10,
    maxDtiRatio: 0.3,
    loanApplicationVelocityLimit: 2,
    description: "Intermediate borrower. Higher limits, lower rates."
  },
  {
    level: 2,
    minTigerScore: 400,
    maxLoanLimit: 500,
    baseInterestRate: 7,
    maxDtiRatio: 0.4,
    loanApplicationVelocityLimit: 1,
    description: "Trusted borrower. Significant limits, good rates."
  },
  {
    level: 3,
    minTigerScore: 600,
    maxLoanLimit: 1000,
    baseInterestRate: 5,
    maxDtiRatio: 0.5,
    loanApplicationVelocityLimit: 1,
    description: "Elite borrower. Maximum limits, best rates."
  }
];

const MIN_REQUIRED_INCOME_PROOF = 100; // Minimum monthly USD equivalent income to be considered for any loan

// Default repayment term options
const REPAYMENT_TERMS = {
  "7_days": 7,
  "15_days": 15,
  "30_days": 30,
  "60_days": 60,
  "90_days": 90
};

module.exports = {
  LOAN_TIERS,
  MIN_REQUIRED_INCOME_PROOF,
  REPAYMENT_TERMS
};