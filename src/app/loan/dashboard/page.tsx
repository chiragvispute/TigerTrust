'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Shield, TrendingUp, Clock, DollarSign, Award, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TigerScore {
  tiger_score: number;
  tier: string;
  risk_category: string;
  confidence_level: number;
  key_factors?: any;
}

interface LoanTerms {
  approved_amount: number;
  interest_rate: number;
  total_repayment_amount: number;
  repayment_days: number;
  repayment_due_date: number;
  repayment_term: string;
  tier: {
    level: number;
    description: string;
  };
  borrower_info?: {
    tiger_score: number;
    tier_name: string;
    verified_income: number;
    current_dti: number;
  };
}

interface LoanEvaluationResult {
  success: boolean;
  proposed_terms?: LoanTerms;
  score_details?: TigerScore;
  rejection_reason?: string;
  tiger_score?: number;
  tier?: string;
  current_dti?: number;
}

const AI_SCORING_API = process.env.NEXT_PUBLIC_AI_SCORING_API || 'http://localhost:5001';

// Tier color mapping
const TIER_COLORS = {
  'Bronze': 'from-orange-400 to-amber-600',
  'Silver': 'from-gray-300 to-gray-500',
  'Gold': 'from-yellow-400 to-yellow-600',
  'Platinum': 'from-indigo-400 to-purple-600',
  'Diamond': 'from-cyan-400 to-blue-600',
};

const TIER_ICONS = {
  'Bronze': '🥉',
  'Silver': '🥈',
  'Gold': '🥇',
  'Platinum': '💎',
  'Diamond': '💠',
};

export default function LoanDashboard() {
  const { publicKey } = useWallet();
  const [tigerScore, setTigerScore] = useState<TigerScore | null>(null);
  const [isLoadingScore, setIsLoadingScore] = useState(true);
  const [loanAmount, setLoanAmount] = useState('');
  const [repaymentTerm, setRepaymentTerm] = useState('30_days');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loanResult, setLoanResult] = useState<LoanEvaluationResult | null>(null);

  // Fetch user's TigerScore on component mount
  useEffect(() => {
    fetchTigerScore();
  }, [publicKey]);

  const fetchTigerScore = async () => {
    setIsLoadingScore(true);
    try {
      // Mock data for demonstration - replace with actual API call
      const mockScoreData = {
        wallet_address: publicKey?.toBase58() || 'demo-wallet',
        wallet_age_days: 180,
        tx_count: 150,
        successful_repayments: 8,
        total_loans: 10,
        defaults: 0,
        human_verified: true,
        monthly_income: 3000,
        outstanding_debt: 500,
        income_verified: true,
        income_debt_ratio: 6,
        activity_regularity_score: 75,
      };

      const response = await fetch(`${AI_SCORING_API}/api/score/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockScoreData),
      });

      if (response.ok) {
        const data = await response.json();
        setTigerScore(data);
      } else {
        // Fallback mock data if API fails
        setTigerScore({
          tiger_score: 750,
          tier: 'Platinum',
          risk_category: 'Low',
          confidence_level: 0.75,
        });
      }
    } catch (error) {
      console.error('Error fetching TigerScore:', error);
      // Fallback mock data
      setTigerScore({
        tiger_score: 750,
        tier: 'Platinum',
        risk_category: 'Low',
        confidence_level: 0.75,
      });
    } finally {
      setIsLoadingScore(false);
    }
  };

  const handleLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoanResult(null);

    try {
      // Mock user data - replace with actual data from your state/context
      const loanRequest = {
        wallet_address: publicKey?.toBase58() || 'demo-wallet',
        loan_amount: parseFloat(loanAmount),
        repayment_term: repaymentTerm,
        // User data for scoring
        wallet_age_days: 180,
        tx_count: 150,
        successful_repayments: 8,
        total_loans: 10,
        defaults: 0,
        human_verified: true,
        monthly_income: 3000,
        outstanding_debt: 500,
        income_verified: true,
        income_debt_ratio: 6,
        activity_regularity_score: 75,
      };

      const response = await fetch(`${AI_SCORING_API}/api/loan/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanRequest),
      });

      const data = await response.json();
      setLoanResult(data);
    } catch (error) {
      console.error('Error evaluating loan:', error);
      setLoanResult({
        success: false,
        rejection_reason: 'Failed to connect to loan evaluation service',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMaxLoanAmount = () => {
    if (!tigerScore) return 50;
    const score = tigerScore.tiger_score;
    if (score >= 600) return 1000;
    if (score >= 400) return 500;
    if (score >= 200) return 150;
    return 50;
  };

  if (isLoadingScore) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-tigerGreen animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600 dark:text-gray-300">Loading your credit profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Header */}
      <div className="pt-12 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-tigerGreen rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-tigerGreen via-green-600 to-emerald-600 bg-clip-text text-transparent">
              Loan Dashboard
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg ml-14">
            Your decentralized lending powered by AI credit scoring
          </p>
        </div>
      </div>

      <div className="px-4 pb-12">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* TigerScore Overview Card */}
          {tigerScore && (
            <Card className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Score Display */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative mb-4">
                    <div className={`text-7xl font-black bg-gradient-to-r ${TIER_COLORS[tigerScore.tier as keyof typeof TIER_COLORS]} bg-clip-text text-transparent`}>
                      {tigerScore.tiger_score}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      / 1000 points
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-tigerGreen/20 to-green-600/20 rounded-full border border-tigerGreen/30">
                    <span className="text-2xl">{TIER_ICONS[tigerScore.tier as keyof typeof TIER_ICONS]}</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {tigerScore.tier} Tier
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Risk Category: <span className="font-semibold text-tigerGreen">{tigerScore.risk_category}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Confidence: <span className="font-semibold">{(tigerScore.confidence_level * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Your Borrowing Power
                  </h3>
                  
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <DollarSign className="w-8 h-8 text-green-600" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Max Loan Amount</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        ${getMaxLoanAmount()} USDC
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Interest Rate Range</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {tigerScore.tiger_score >= 600 ? '5%' : tigerScore.tiger_score >= 400 ? '7%' : tigerScore.tiger_score >= 200 ? '10%' : '15%'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Clock className="w-8 h-8 text-purple-600" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Available Terms</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        7 - 90 days
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Loan Application Form */}
          {!loanResult && (
            <Card className="p-8 bg-white dark:bg-gray-800 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-6 h-6 text-tigerGreen" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Apply for a Loan
                </h2>
              </div>

              <form onSubmit={handleLoanSubmit} className="space-y-6">
                {/* Loan Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Loan Amount (USDC)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      placeholder={`Max: ${getMaxLoanAmount()} USDC`}
                      min="10"
                      max={getMaxLoanAmount()}
                      step="10"
                      required
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-tigerGreen focus:border-tigerGreen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Based on your TigerScore, you can borrow up to ${getMaxLoanAmount()} USDC
                  </p>
                </div>

                {/* Repayment Term */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Repayment Term
                  </label>
                  <select
                    value={repaymentTerm}
                    onChange={(e) => setRepaymentTerm(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-tigerGreen focus:border-tigerGreen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="7_days">7 Days</option>
                    <option value="15_days">15 Days</option>
                    <option value="30_days">30 Days</option>
                    <option value="60_days">60 Days</option>
                    <option value="90_days">90 Days</option>
                  </select>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !loanAmount}
                  className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-tigerGreen to-green-600 hover:from-green-700 hover:to-green-800 text-white rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2 inline" />
                      Evaluating Your Application...
                    </>
                  ) : (
                    'Submit Loan Application'
                  )}
                </Button>
              </form>
            </Card>
          )}

          {/* Loan Result Display */}
          {loanResult && (
            <Card className={`p-8 border-2 ${
              loanResult.success 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-500' 
                : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-500'
            }`}>
              {loanResult.success && loanResult.proposed_terms ? (
                <div className="space-y-6">
                  {/* Approval Header */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
                      <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-green-900 dark:text-green-100 mb-2">
                      Loan Approved! 🎉
                    </h2>
                    <p className="text-lg text-green-700 dark:text-green-300">
                      Congratulations! Your loan has been approved with the following terms:
                    </p>
                  </div>

                  {/* Loan Terms Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved Amount</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                ${loanResult.proposed_terms.approved_amount} USDC
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Interest Rate</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {loanResult.proposed_terms.interest_rate}%
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Repayment</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        ${loanResult.proposed_terms.total_repayment_amount.toFixed(2)} USDC
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Repayment Term</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {loanResult.proposed_terms.repayment_days} days
                      </div>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Due Date</div>
                        <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                          {new Date(loanResult.proposed_terms.repayment_due_date * 1000).toLocaleDateString()}
                        </div>
                      </div>
                      <Clock className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>

                  {/* Borrower Info */}
                  {loanResult.proposed_terms.borrower_info && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Your Credit Profile</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">TigerScore:</span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                            {loanResult.proposed_terms.borrower_info.tiger_score}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Tier:</span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                            {loanResult.proposed_terms.borrower_info.tier_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">DTI Ratio:</span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                            {loanResult.proposed_terms.borrower_info.current_dti.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Verified Income:</span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                            ${loanResult.proposed_terms.borrower_info.verified_income}/mo
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button className="flex-1 py-4 text-lg font-semibold bg-gradient-to-r from-tigerGreen to-green-600 hover:from-green-700 hover:to-green-800 text-white rounded-xl shadow-lg">
                      Accept Loan & Sign Transaction
                    </Button>
                    <Button
                      onClick={() => setLoanResult(null)}
                      className="px-8 py-4 text-lg font-semibold bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Rejection Header */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500 rounded-full mb-4">
                      <AlertCircle className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-red-900 dark:text-red-100 mb-2">
                      Loan Application Declined
                    </h2>
                    <p className="text-lg text-red-700 dark:text-red-300 mb-4">
                      {loanResult.rejection_reason || 'Unable to approve loan at this time'}
                    </p>
                  </div>

                  {/* Credit Score Info */}
                  {loanResult.tiger_score && (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your TigerScore</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {loanResult.tiger_score}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Tier</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {loanResult.tier}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                      💡 How to Improve Your Eligibility:
                    </h3>
                    <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                      <li>• Complete more successful loan repayments</li>
                      <li>• Verify your income through Stripe integration</li>
                      <li>• Increase your on-chain activity and transaction history</li>
                      <li>• Reduce your current debt-to-income ratio</li>
                      <li>• Maintain regular blockchain activity patterns</li>
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={() => setLoanResult(null)}
                      className="flex-1 py-4 text-lg font-semibold bg-tigerGreen hover:bg-green-700 text-white rounded-xl shadow-lg"
                    >
                      Try Different Amount
                    </Button>
                    <Button
                      onClick={fetchTigerScore}
                      className="flex-1 py-4 text-lg font-semibold bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl"
                    >
                      Refresh Credit Score
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Info Card */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  About TigerTrust Loans
                </h3>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>• Instant AI-powered credit evaluation using your on-chain history</li>
                  <li>• No traditional credit checks required</li>
                  <li>• Flexible repayment terms from 7 to 90 days</li>
                  <li>• Competitive interest rates based on your TigerScore</li>
                  <li>• Fully decentralized and transparent on Solana blockchain</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
