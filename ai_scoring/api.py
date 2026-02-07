"""
TigerTrust AI Scoring API
Flask REST API that integrates Gemini AI scoring with Solana blockchain updates
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv
from pathlib import Path

from gemini_scorer import TigerScoreAI
from score_updater import TigerScoreUpdater

# Load environment variables - try root .env first, then local
root_env = Path(__file__).parent.parent / ".env"
local_env = Path(__file__).parent / ".env"
if root_env.exists():
    load_dotenv(root_env)
elif local_env.exists():
    load_dotenv(local_env)
else:
    load_dotenv()  # Load from system environment

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize AI scorer
scorer = TigerScoreAI()

# Global updater (will be initialized in async context when needed)
_updater = None


async def get_updater():
    """Get or create TigerScore updater instance"""
    global _updater
    if _updater is None:
        _updater = TigerScoreUpdater()
    return _updater


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "TigerTrust AI Scoring API",
        "gemini_configured": bool(os.getenv('GEMINI_API_KEY')),
        "solana_configured": bool(os.getenv('SOLANA_RPC_URL')),
        "timestamp": datetime.utcnow().isoformat()
    }), 200


@app.route('/api/score/calculate', methods=['POST'])
def calculate_score():
    """
    Calculate TigerScore using AI (does not update on-chain)
    
    Request body:
    {
        "wallet_address": "string",
        "wallet_age_days": number,
        "tx_count": number,
        "total_volume": number,
        "nft_count": number,
        "token_count": number,
        "defi_protocols": [],
        "human_verified": boolean,
        "education_vcs": [],
        "employment_vcs": [],
        "financial_vcs": [],
        "identity_level": "string",
        "total_loans": number,
        "successful_repayments": number,
        "defaults": number,
        "avg_repayment_days": number,
        "total_borrowed": number,
        "total_repaid": number,
        "outstanding_debt": number,
        "on_time_rate": number
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'wallet_address' not in data:
            return jsonify({
                "success": False,
                "error": "wallet_address is required"
            }), 400
        
        logger.info(f"Calculating score for wallet: {data['wallet_address']}")
        
        # Calculate score using AI
        result = scorer.calculate_score(data)
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error calculating score: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/score/calculate-and-update', methods=['POST'])
def calculate_and_update_score():
    """
    Calculate TigerScore using AI and update on-chain User Profile PDA
    
    Same request body as /api/score/calculate
    """
    try:
        data = request.get_json()
        
        if not data or 'wallet_address' not in data:
            return jsonify({
                "success": False,
                "error": "wallet_address is required"
            }), 400
        
        wallet_address = data['wallet_address']
        logger.info(f"Calculating and updating score for wallet: {wallet_address}")
        
        # Run async update
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def _update():
            updater = await get_updater()
            return await updater.calculate_and_update(wallet_address, data)
        
        result = loop.run_until_complete(_update())
        loop.close()
        
        return jsonify({
            "success": result.get('on_chain_update', {}).get('success', False),
            **result
        }), 200
        
    except Exception as e:
        logger.error(f"Error calculating and updating score: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/score/update', methods=['POST'])
def update_score_only():
    """
    Update TigerScore on-chain (without recalculating)
    
    Request body:
    {
        "wallet_address": "string",
        "score": number (0-1000),
        "tier": "Bronze|Silver|Gold|Platinum|Diamond"
    }
    """
    try:
        data = request.get_json()
        
        required_fields = ['wallet_address', 'score', 'tier']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "success": False,
                    "error": f"{field} is required"
                }), 400
        
        wallet_address = data['wallet_address']
        score = data['score']
        tier = data['tier']
        
        # Validate score
        if not isinstance(score, (int, float)) or score < 0 or score > 1000:
            return jsonify({
                "success": False,
                "error": "score must be between 0 and 1000"
            }), 400
        
        # Validate tier
        valid_tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']
        if tier not in valid_tiers:
            return jsonify({
                "success": False,
                "error": f"tier must be one of: {', '.join(valid_tiers)}"
            }), 400
        
        logger.info(f"Updating score for wallet: {wallet_address} to {score} ({tier})")
        
        # Run async update
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def _update():
            updater = await get_updater()
            return await updater.update_tiger_score(wallet_address, int(score), tier)
        
        result = loop.run_until_complete(_update())
        loop.close()
        
        return jsonify(result), 200 if result.get('success') else 500
        
    except Exception as e:
        logger.error(f"Error updating score: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/profile/<wallet_address>', methods=['GET'])
def get_profile(wallet_address: str):
    """
    Fetch user profile from on-chain PDA
    """
    try:
        logger.info(f"Fetching profile for wallet: {wallet_address}")
        
        # Run async fetch
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def _fetch():
            updater = await get_updater()
            return await updater.fetch_user_profile(wallet_address)
        
        profile = loop.run_until_complete(_fetch())
        loop.close()
        
        if profile is None:
            return jsonify({
                "success": False,
                "error": "User profile not found"
            }), 404
        
        return jsonify({
            "success": True,
            "profile": profile
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching profile: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/batch/calculate', methods=['POST'])
def batch_calculate():
    """
    Calculate scores for multiple wallets in batch
    
    Request body:
    {
        "users": [
            { user_data_1 },
            { user_data_2 },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'users' not in data:
            return jsonify({
                "success": False,
                "error": "users array is required"
            }), 400
        
        users_data = data['users']
        
        if not isinstance(users_data, list) or len(users_data) == 0:
            return jsonify({
                "success": False,
                "error": "users must be a non-empty array"
            }), 400
        
        logger.info(f"Batch calculating scores for {len(users_data)} users")
        
        # Calculate scores in batch
        results = scorer.batch_score(users_data)
        
        return jsonify({
            "success": True,
            "total": len(results),
            "results": results
        }), 200
        
    except Exception as e:
        logger.error(f"Error in batch calculation: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/trigger/recalculate', methods=['POST'])
def trigger_recalculation():
    """
    Trigger a recalculation event (called after significant events)
    
    Request body:
    {
        "wallet_address": "string",
        "event_type": "loan_taken|repayment|default|vc_issued|human_verified"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'wallet_address' not in data:
            return jsonify({
                "success": False,
                "error": "wallet_address is required"
            }), 400
        
        wallet_address = data['wallet_address']
        event_type = data.get('event_type', 'manual_trigger')
        
        logger.info(f"Triggered recalculation for {wallet_address} due to event: {event_type}")
        
        # In a production system, this would:
        # 1. Fetch latest on-chain data
        # 2. Fetch VCs and other credentials
        # 3. Calculate new score
        # 4. Update on-chain
        
        # For now, return acknowledgment
        return jsonify({
            "success": True,
            "message": "Recalculation triggered",
            "wallet_address": wallet_address,
            "event_type": event_type,
            "status": "queued",
            "timestamp": datetime.utcnow().isoformat()
        }), 202  # 202 Accepted
        
    except Exception as e:
        logger.error(f"Error triggering recalculation: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/score/from-rse', methods=['POST'])
def calculate_from_rse():
    """
    Calculate TigerScore directly from RSE server data format
    
    Request body (your existing RSE format):
    {
        "wallet": "address",
        "score": 300,
        "tier": "Bronze",
        "features_used": {
            "txCount": 1,
            "walletAgeDays": 0,
            "nftCount": 0,
            "successfulRepayments": 0,
            "defaults": 0,
            "humanVerified": false,
            "tokenCount": 0,
            "hasVC": false
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'wallet' not in data:
            return jsonify({
                "success": False,
                "error": "wallet is required"
            }), 400
        
        wallet_address = data['wallet']
        features = data.get('features_used', {})
        
        logger.info(f"Calculating score from RSE data for: {wallet_address}")
        
        # Transform RSE format to AI scorer format
        user_data = {
            'wallet_address': wallet_address,
            'wallet_age_days': features.get('walletAgeDays', 0),
            'tx_count': features.get('txCount', 0),
            'nft_count': features.get('nftCount', 0),
            'token_count': features.get('tokenCount', 0),
            'human_verified': features.get('humanVerified', False),
            'successful_repayments': features.get('successfulRepayments', 0),
            'defaults': features.get('defaults', 0),
            'has_vc': features.get('hasVC', False),
            'education_vcs': ['Education VC'] if features.get('hasVC') else [],
            'total_loans': features.get('successfulRepayments', 0) + features.get('defaults', 0),
            'on_time_rate': 100 if features.get('defaults', 0) == 0 else 50,
            
            # Activity regularity features (NEW)
            'active_days_last_30': features.get('activeDaysLast30', 0),
            'avg_tx_per_active_day': features.get('avgTxPerActiveDay', 0),
            'activity_regularity_score': features.get('activityRegularityScore', 0),
            'recent_activity_score': features.get('activityRegularityScore', min(100, features.get('txCount', 0))),
            
            # Stripe income features (NEW)
            'monthly_income': features.get('monthlyIncome', 0),
            'debt': features.get('debt', 0),
            'income_verified': features.get('incomeVerified', False),
            'income_bracket': features.get('incomeBracket', 'low'),
            'income_debt_ratio': features.get('incomeDebtRatio', 0),
            
            'smart_contract_count': features.get('txCount', 0) // 2,
            'total_volume': 0,
            'defi_protocols': [],
            'employment_vcs': [],
            'financial_vcs': [],
            'identity_level': 'Verified' if features.get('humanVerified') else 'None',
            'avg_repayment_days': 0,
            'total_borrowed': 0,
            'total_repaid': 0,
            'outstanding_debt': features.get('debt', 0),  # Map debt from Stripe
            'network_score': 50,
            'anomaly_flags': []
        }
        
        # Calculate score using AI
        result = scorer.calculate_score(user_data)
        
        # Include comparison with RSE score
        result['rse_comparison'] = {
            'rse_score': data.get('score', 0),
            'rse_tier': data.get('tier', 'Unknown'),
            'ai_score': result['tiger_score'],
            'ai_tier': result['tier'],
            'score_difference': result['tiger_score'] - data.get('score', 0)
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error calculating from RSE data: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/loan/evaluate', methods=['POST'])
def evaluate_loan_application():
    """
    Evaluate loan application by calculating TigerScore and making loan decision
    Combines AI scoring with loan decision logic
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['wallet_address', 'loan_amount', 'repayment_term']
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({
                "success": False,
                "rejection_reason": f"Missing required fields: {', '.join(missing)}"
            }), 400
        
        wallet_address = data.get('wallet_address')
        loan_amount = data.get('loan_amount')
        repayment_term = data.get('repayment_term')
        
        # Validate loan amount
        if not isinstance(loan_amount, (int, float)) or loan_amount <= 0:
            return jsonify({
                "success": False,
                "rejection_reason": "Invalid loan amount. Must be a positive number."
            }), 400
        
        # Validate repayment term
        REPAYMENT_TERMS = {
            "7_days": 7,
            "15_days": 15,
            "30_days": 30,
            "60_days": 60,
            "90_days": 90
        }
        if repayment_term not in REPAYMENT_TERMS:
            return jsonify({
                "success": False,
                "rejection_reason": f"Invalid repayment term. Supported: {', '.join(REPAYMENT_TERMS.keys())}"
            }), 400
        
        logger.info(f"Evaluating loan application for {wallet_address}, amount: ${loan_amount}")
        
        # Step 1: Calculate TigerScore
        user_score_data = {
            'wallet_address': wallet_address,
            'wallet_age_days': data.get('wallet_age_days', 0),
            'tx_count': data.get('tx_count', 0),
            'total_volume': data.get('total_volume', 0),
            'nft_count': data.get('nft_count', 0),
            'token_count': data.get('token_count', 0),
            'defi_protocols': data.get('defi_protocols', []),
            'human_verified': data.get('human_verified', False),
            'identity_level': data.get('identity_level', 'None'),
            'education_vcs': data.get('education_vcs', []),
            'employment_vcs': data.get('employment_vcs', []),
            'financial_vcs': data.get('financial_vcs', []),
            'total_loans': data.get('total_loans', 0),
            'successful_repayments': data.get('successful_repayments', 0),
            'defaults': data.get('defaults', 0),
            'avg_repayment_days': data.get('avg_repayment_days', 0),
            'total_borrowed': data.get('total_borrowed', 0),
            'total_repaid': data.get('total_repaid', 0),
            'outstanding_debt': data.get('outstanding_debt', 0),
            'on_time_rate': data.get('on_time_rate', 0),
            'recent_activity_score': data.get('recent_activity_score', 0),
            'active_days_last_30': data.get('active_days_last_30', 0),
            'avg_tx_per_active_day': data.get('avg_tx_per_active_day', 0),
            'activity_regularity_score': data.get('activity_regularity_score', 0),
            'network_score': data.get('network_score', 0),
            'smart_contract_count': data.get('smart_contract_count', 0),
            'monthly_income': data.get('monthly_income', 0),
            'debt': data.get('debt', 0),
            'income_verified': data.get('income_verified', False),
            'income_bracket': data.get('income_bracket', 'low'),
            'income_debt_ratio': data.get('income_debt_ratio', 0)
        }
        
        score_result = scorer.calculate_score(user_score_data)
        tiger_score = score_result['tiger_score']
        
        logger.info(f"TigerScore calculated: {tiger_score}")
        
        # Step 2: Determine loan tier based on TigerScore
        LOAN_TIERS = [
            {
                'level': 0,
                'min_tiger_score': 0,
                'max_loan_limit': 50,
                'base_interest_rate': 15,
                'max_dti_ratio': 0.2,
                'description': "Entry-level micro-loan"
            },
            {
                'level': 1,
                'min_tiger_score': 200,
                'max_loan_limit': 150,
                'base_interest_rate': 10,
                'max_dti_ratio': 0.3,
                'description': "Intermediate borrower"
            },
            {
                'level': 2,
                'min_tiger_score': 400,
                'max_loan_limit': 500,
                'base_interest_rate': 7,
                'max_dti_ratio': 0.4,
                'description': "Trusted borrower"
            },
            {
                'level': 3,
                'min_tiger_score': 600,
                'max_loan_limit': 1000,
                'base_interest_rate': 5,
                'max_dti_ratio': 0.5,
                'description': "Elite borrower"
            }
        ]
        
        appropriate_tier = None
        for tier in reversed(LOAN_TIERS):
            if tiger_score >= tier['min_tiger_score']:
                appropriate_tier = tier
                break
        
        if not appropriate_tier:
            return jsonify({
                "success": False,
                "rejection_reason": f"Insufficient TigerScore ({tiger_score}). Minimum required: {LOAN_TIERS[0]['min_tiger_score']}",
                "tiger_score": tiger_score,
                "tier": score_result.get('tier')
            }), 200
        
        logger.info(f"Qualified for loan tier {appropriate_tier['level']}: {appropriate_tier['description']}")
        
        # Step 3: Check income and DTI
        MIN_REQUIRED_INCOME = 100
        verified_monthly_income = data.get('monthly_income', 0)
        
        if verified_monthly_income < MIN_REQUIRED_INCOME:
            return jsonify({
                "success": False,
                "rejection_reason": f"Insufficient verified income (${verified_monthly_income}). Minimum required: ${MIN_REQUIRED_INCOME}/month",
                "tiger_score": tiger_score,
                "tier": score_result.get('tier')
            }), 200
        
        outstanding_debt = data.get('outstanding_debt', 0)
        current_dti = outstanding_debt / verified_monthly_income if verified_monthly_income > 0 else 0
        
        if current_dti > appropriate_tier['max_dti_ratio']:
            return jsonify({
                "success": False,
                "rejection_reason": f"High Debt-to-Income Ratio ({current_dti * 100:.1f}%). Maximum allowed: {appropriate_tier['max_dti_ratio'] * 100:.1f}%",
                "tiger_score": tiger_score,
                "tier": score_result.get('tier'),
                "current_dti": round(current_dti * 100, 1)
            }), 200
        
        # Step 4: Calculate maximum approved amount
        tier_max_amount = appropriate_tier['max_loan_limit']
        score_based_limit = int(tiger_score * 0.8)
        income_based_limit = int(verified_monthly_income * 0.3)
        
        max_approved_amount = min(tier_max_amount, score_based_limit, income_based_limit)
        
        if max_approved_amount < 10:
            return jsonify({
                "success": False,
                "rejection_reason": f"Maximum approved amount (${max_approved_amount}) is too low. Please build your TigerScore first.",
                "tiger_score": tiger_score,
                "tier": score_result.get('tier')
            }), 200
        
        # Step 5: Calculate loan terms
        approved_amount = min(loan_amount, max_approved_amount)
        interest_rate = appropriate_tier['base_interest_rate']
        repayment_days = REPAYMENT_TERMS[repayment_term]
        
        # Simple interest calculation
        interest_amount = (approved_amount * interest_rate * repayment_days) / (100 * 365)
        total_repayment_amount = approved_amount + interest_amount
        daily_payment = total_repayment_amount / repayment_days
        
        # Calculate due date
        import time
        current_timestamp = int(time.time())
        repayment_due_date = current_timestamp + (repayment_days * 24 * 60 * 60)
        
        # Build response
        proposed_terms = {
            'approved_amount': round(approved_amount, 2),
            'requested_amount': loan_amount,
            'interest_rate': interest_rate,
            'repayment_term': repayment_term,
            'repayment_days': repayment_days,
            'interest_amount': round(interest_amount, 2),
            'total_repayment_amount': round(total_repayment_amount, 2),
            'daily_payment': round(daily_payment, 2),
            'repayment_due_date': repayment_due_date,
            'tier': {
                'level': appropriate_tier['level'],
                'description': appropriate_tier['description']
            },
            'borrower_info': {
                'tiger_score': tiger_score,
                'tier_name': score_result.get('tier'),
                'verified_income': verified_monthly_income,
                'current_dti': round(current_dti * 100, 1),
                'outstanding_debt': round(outstanding_debt, 2)
            }
        }
        
        logger.info(f"Loan approved - Amount: ${approved_amount}, Interest: {interest_rate}%, Term: {repayment_days} days")
        
        return jsonify({
            "success": True,
            "proposed_terms": proposed_terms,
            "score_details": {
                'tiger_score': tiger_score,
                'tier': score_result.get('tier'),
                'risk_category': score_result.get('risk_category'),
                'confidence_level': score_result.get('confidence_level'),
                'model_used': score_result.get('model_used')
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error evaluating loan application: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/test/gemini', methods=['GET'])
def test_gemini():
    """Test Gemini API connection"""
    try:
        test_data = {
            'wallet_address': 'test_wallet',
            'wallet_age_days': 100,
            'tx_count': 50,
            'human_verified': True,
            'total_loans': 1,
            'successful_repayments': 1,
            'defaults': 0
        }
        
        result = scorer.calculate_score(test_data)
        
        return jsonify({
            "success": True,
            "message": "Gemini API is working",
            "test_result": {
                "score": result.get('tiger_score'),
                "tier": result.get('tier'),
                "model": result.get('model_used')
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == '__main__':
    # Run the Flask app
    port = int(os.getenv('AI_SCORING_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
