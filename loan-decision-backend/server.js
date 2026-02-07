const express = require('express');
const { Connection, PublicKey } = require('@solana/web3.js');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables - try root .env first
const rootEnvPath = path.resolve(__dirname, '../.env');
const localEnvPath = path.resolve(__dirname, '.env');
dotenv.config({ path: rootEnvPath });
if (!process.env.SOLANA_RPC_URL) {
  dotenv.config({ path: localEnvPath });
}

// Import our utilities and configuration
const {
  getUserProfile,
  getOutstandingLoans,
  getVerifiedIncome
} = require('./utils/loanProgram');

const {
  LOAN_TIERS,
  MIN_REQUIRED_INCOME_PROOF,
  REPAYMENT_TERMS
} = require('./config');

const app = express();
const PORT = process.env.LOAN_DECISION_PORT || process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Solana connection
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');

/**
 * Main loan application endpoint
 * POST /api/loan/apply
 */
app.post('/api/loan/apply', async (req, res) => {
  try {
    const { walletAddress, loanAmount, repaymentTerm } = req.body;

    // Input validation
    if (!walletAddress || !loanAmount || !repaymentTerm) {
      return res.status(400).json({
        success: false,
        rejectionReason: "Missing required fields: walletAddress, loanAmount, repaymentTerm"
      });
    }

    if (typeof loanAmount !== 'number' || loanAmount <= 0) {
      return res.status(400).json({
        success: false,
        rejectionReason: "Invalid loan amount. Must be a positive number."
      });
    }

    if (!REPAYMENT_TERMS[repaymentTerm]) {
      return res.status(400).json({
        success: false,
        rejectionReason: `Invalid repayment term. Supported terms: ${Object.keys(REPAYMENT_TERMS).join(', ')}`
      });
    }

    let walletPublicKey;
    try {
      walletPublicKey = new PublicKey(walletAddress);
    } catch (error) {
      return res.status(400).json({
        success: false,
        rejectionReason: "Invalid wallet address format."
      });
    }

    console.log(`Processing loan application for ${walletAddress}, amount: ${loanAmount} USDC`);

    // Step 1: Fetch User Profile
    const userProfile = await getUserProfile(connection, walletPublicKey);
    if (!userProfile) {
      return res.json({
        success: false,
        rejectionReason: "User profile not found. Please complete identity verification first."
      });
    }

    console.log(`User profile found - TigerScore: ${userProfile.tigerScore}, Tier: ${userProfile.levelUpTier}`);

    // Step 2: Determine appropriate loan tier based on TigerScore
    let appropriateTier = null;
    for (let i = LOAN_TIERS.length - 1; i >= 0; i--) {
      if (userProfile.tigerScore >= LOAN_TIERS[i].minTigerScore) {
        appropriateTier = LOAN_TIERS[i];
        break;
      }
    }

    if (!appropriateTier) {
      return res.json({
        success: false,
        rejectionReason: `Insufficient TigerScore (${userProfile.tigerScore}). Minimum required: ${LOAN_TIERS[0].minTigerScore}`
      });
    }

    console.log(`Qualified for tier ${appropriateTier.level}: ${appropriateTier.description}`);

    // Step 3: Calculate Debt-to-Income Ratio
    const verifiedMonthlyIncomeUSD = getVerifiedIncome(userProfile);
    
    if (verifiedMonthlyIncomeUSD < MIN_REQUIRED_INCOME_PROOF) {
      return res.json({
        success: false,
        rejectionReason: `Insufficient verified income ($${verifiedMonthlyIncomeUSD}). Minimum required: $${MIN_REQUIRED_INCOME_PROOF}/month`
      });
    }

    // Fetch outstanding loans to calculate current debt
    const outstandingLoans = await getOutstandingLoans(connection, walletPublicKey);
    const outstandingDebtUSD = outstandingLoans.reduce((total, loan) => {
      // Convert from lamports/smallest unit to USDC (assuming 6 decimals)
      return total + (loan.outstandingAmount / 1000000);
    }, 0);

    const currentDti = outstandingDebtUSD / verifiedMonthlyIncomeUSD;

    console.log(`DTI Analysis - Income: $${verifiedMonthlyIncomeUSD}, Debt: $${outstandingDebtUSD}, DTI: ${(currentDti * 100).toFixed(2)}%`);

    if (currentDti > appropriateTier.maxDtiRatio) {
      return res.json({
        success: false,
        rejectionReason: `High Debt-to-Income Ratio (${(currentDti * 100).toFixed(1)}%). Maximum allowed: ${(appropriateTier.maxDtiRatio * 100).toFixed(1)}%`
      });
    }

    // Step 4: Check loan application velocity (mock implementation)
    // In a real implementation, this would check application history from database
    const recentApplications = Math.floor(Math.random() * 3); // Mock: 0-2 recent applications
    if (recentApplications >= appropriateTier.loanApplicationVelocityLimit) {
      return res.json({
        success: false,
        rejectionReason: `Too many recent loan applications (${recentApplications}). Please wait before applying again.`
      });
    }

    // Step 5: Calculate maximum approved loan amount
    const tierMaxAmount = appropriateTier.maxLoanLimit;
    const scoreBasedLimit = Math.floor(userProfile.tigerScore * 0.8); // 0.8 USDC per TigerScore point
    const incomeBasedLimit = Math.floor(verifiedMonthlyIncomeUSD * 0.3); // 30% of monthly income
    
    const maxApprovedLoanAmount = Math.min(tierMaxAmount, scoreBasedLimit, incomeBasedLimit);

    // Step 6: Check if requested amount is within limits
    if (loanAmount > maxApprovedLoanAmount) {
      // Offer the maximum amount instead of rejecting
      if (maxApprovedLoanAmount < 10) { // If max approved is too low, reject
        return res.json({
          success: false,
          rejectionReason: `Requested amount ($${loanAmount}) exceeds maximum approved amount ($${maxApprovedLoanAmount}). Please build your TigerScore first.`
        });
      }
    }

    // Step 7: Calculate proposed terms
    const approvedAmount = Math.min(loanAmount, maxApprovedLoanAmount);
    const interestRate = appropriateTier.baseInterestRate;
    const repaymentDays = REPAYMENT_TERMS[repaymentTerm];
    
    // Calculate total repayment amount (simple interest)
    const interestAmount = (approvedAmount * interestRate * repaymentDays) / (100 * 365);
    const totalRepaymentAmount = approvedAmount + interestAmount;
    const dailyPayment = totalRepaymentAmount / repaymentDays;

    // Calculate repayment due date (timestamp)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const repaymentDueDate = currentTimestamp + (repaymentDays * 24 * 60 * 60);

    // Success response with proposed terms
    const proposedTerms = {
      approvedAmount,
      requestedAmount: loanAmount,
      interestRate,
      repaymentTerm,
      repaymentDays,
      interestAmount: Math.round(interestAmount * 100) / 100, // Round to 2 decimals
      totalRepaymentAmount: Math.round(totalRepaymentAmount * 100) / 100,
      dailyPayment: Math.round(dailyPayment * 100) / 100,
      repaymentDueDate,
      tier: {
        level: appropriateTier.level,
        description: appropriateTier.description
      },
      borrowerInfo: {
        tigerScore: userProfile.tigerScore,
        verifiedIncome: verifiedMonthlyIncomeUSD,
        currentDti: Math.round(currentDti * 1000) / 10, // As percentage with 1 decimal
        outstandingDebt: Math.round(outstandingDebtUSD * 100) / 100
      }
    };

    console.log(`Loan approved - Amount: $${approvedAmount}, Interest: ${interestRate}%, Term: ${repaymentDays} days`);

    return res.json({
      success: true,
      proposedTerms
    });

  } catch (error) {
    console.error('Error processing loan application:', error);
    return res.status(500).json({
      success: false,
      rejectionReason: "Internal server error. Please try again later."
    });
  }
});

/**
 * Health check endpoint
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    solanaRpc: process.env.SOLANA_RPC_URL,
    version: '1.0.0'
  });
});

/**
 * Get loan tiers information
 * GET /api/loan/tiers
 */
app.get('/api/loan/tiers', (req, res) => {
  res.json({
    success: true,
    tiers: LOAN_TIERS,
    repaymentTerms: Object.keys(REPAYMENT_TERMS),
    minRequiredIncome: MIN_REQUIRED_INCOME_PROOF
  });
});

/**
 * Get user loan eligibility (without applying)
 * GET /api/loan/eligibility/:walletAddress
 */
app.get('/api/loan/eligibility/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    let walletPublicKey;
    try {
      walletPublicKey = new PublicKey(walletAddress);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address format."
      });
    }

    const userProfile = await getUserProfile(connection, walletPublicKey);
    if (!userProfile) {
      return res.json({
        success: false,
        error: "User profile not found. Please complete identity verification first."
      });
    }

    // Determine tier
    let appropriateTier = LOAN_TIERS[0];
    for (let i = LOAN_TIERS.length - 1; i >= 0; i--) {
      if (userProfile.tigerScore >= LOAN_TIERS[i].minTigerScore) {
        appropriateTier = LOAN_TIERS[i];
        break;
      }
    }

    const verifiedIncome = getVerifiedIncome(userProfile);
    const outstandingLoans = await getOutstandingLoans(connection, walletPublicKey);
    const outstandingDebt = outstandingLoans.reduce((total, loan) => total + (loan.outstandingAmount / 1000000), 0);
    const currentDti = outstandingDebt / verifiedIncome;

    const tierMaxAmount = appropriateTier.maxLoanLimit;
    const scoreBasedLimit = Math.floor(userProfile.tigerScore * 0.8);
    const incomeBasedLimit = Math.floor(verifiedIncome * 0.3);
    const maxEligibleAmount = Math.min(tierMaxAmount, scoreBasedLimit, incomeBasedLimit);

    res.json({
      success: true,
      eligibility: {
        tigerScore: userProfile.tigerScore,
        tier: appropriateTier,
        maxEligibleAmount,
        verifiedIncome,
        currentDti: Math.round(currentDti * 1000) / 10,
        outstandingDebt: Math.round(outstandingDebt * 100) / 100,
        isEligible: verifiedIncome >= MIN_REQUIRED_INCOME_PROOF && currentDti <= appropriateTier.maxDtiRatio
      }
    });

  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error."
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    rejectionReason: "Internal server error."
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 TigerTrust Loan Decision Backend running on port ${PORT}`);
  console.log(`📊 Connected to Solana RPC: ${process.env.SOLANA_RPC_URL}`);
  console.log(`💼 User Profile Program ID: ${process.env.USER_PROFILE_PROGRAM_ID || 'NOT_SET'}`);
  console.log(`🏦 Loan Account Program ID: ${process.env.LOAN_ACCOUNT_PROGRAM_ID || 'NOT_SET'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  POST http://localhost:${PORT}/api/loan/apply`);
  console.log(`  GET  http://localhost:${PORT}/api/loan/eligibility/:walletAddress`);
  console.log(`  GET  http://localhost:${PORT}/api/loan/tiers`);
  console.log(`  GET  http://localhost:${PORT}/api/health`);
});

module.exports = app;