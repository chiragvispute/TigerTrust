"""
TigerTrust AI Scoring Model using Gemini API
Analyzes on-chain data, VCs, and repayment history to compute TigerScore
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

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

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class TigerScoreAI:
    """AI-powered scoring engine using Gemini API"""
    
    def __init__(self, model_name: str = None):
        """
        Initialize the AI scoring model
        
        Args:
            model_name: Gemini model to use (default: from GEMINI_MODEL env variable or gemini-1.5-flash)
        """
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        # Use env variable if model_name not provided
        if model_name is None:
            model_name = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')
        
        self.model = genai.GenerativeModel(model_name)
        logger.info(f"Initialized TigerScoreAI with model: {model_name}")
    
    def _build_scoring_prompt(self, user_data: Dict[str, Any]) -> str:
        """Build ultra-concise prompt for token-limited Gemini"""
        prompt = f"""Credit score 0-1000. JSON only.

Loans: {user_data.get('successful_repayments', 0)}/{user_data.get('total_loans', 0)} paid, {user_data.get('defaults', 0)} defaults
Human: {user_data.get('human_verified', False)}, Income: ${user_data.get('monthly_income', 0)}

Return ONLY:
{{"tiger_score":<0-1000>,"tier":"<Bronze|Silver|Gold|Platinum|Diamond>","confidence_level":<0-1>,"risk_category":"<High|Medium|Low>","key_factors":{{"repayment_contribution":<int>,"vc_contribution":<int>,"financial_contribution":<int>,"onchain_contribution":<int>,"behavioral_contribution":<int>}},"reasoning":"<10 words>"}}"""
        return prompt
    
    def calculate_score(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate TigerScore using fallback mechanism (Gemini disabled due to quota)
        
        Args:
            user_data: Comprehensive user data dictionary
        
        Returns:
            Dictionary containing score, tier, and detailed analysis
        """
        logger.info(f"Calculating TigerScore for wallet: {user_data.get('wallet_address', 'unknown')} using fallback mechanism")
        return self._fallback_scoring(user_data)
    
    def _fallback_scoring(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fallback scoring method if Gemini API fails
        Uses simple rule-based approach
        """
        logger.warning("Using fallback scoring method")
        
        score = 300  # Base score
        
        # Repayment history (most important)
        successful_repayments = user_data.get('successful_repayments', 0)
        defaults = user_data.get('defaults', 0)
        score += successful_repayments * 60
        score -= defaults * 120
        
        # Human verification
        if user_data.get('human_verified', False):
            score += 80
        
        # On-chain activity
        wallet_age = user_data.get('wallet_age_days', 0)
        if wallet_age > 180:
            score += 40
        
        tx_count = user_data.get('tx_count', 0)
        if tx_count > 100:
            score += 40
        
        nft_count = user_data.get('nft_count', 0)
        if nft_count > 0:
            score += 20
        
        # VCs
        has_vcs = len(user_data.get('education_vcs', [])) > 0 or \
                  len(user_data.get('employment_vcs', [])) > 0 or \
                  len(user_data.get('financial_vcs', [])) > 0
        
        if has_vcs:
            score += 30
        
        # Stripe income verification (NEW)
        if user_data.get('income_verified', False):
            score += 60
            income_debt_ratio = user_data.get('income_debt_ratio', 0)
            if income_debt_ratio > 2:
                score += 50  # High income vs debt
            elif income_debt_ratio > 1:
                score += 25  # Moderate income vs debt
        
        # Activity regularity (NEW)
        activity_regularity = user_data.get('activity_regularity_score', 0)
        if activity_regularity > 60:
            score += 40  # Very regular activity
        elif activity_regularity > 30:
            score += 20  # Somewhat regular activity
        
        # Clamp score
        score = max(0, min(1000, score))
        
        # Determine tier
        tier = self._get_tier(score)
        
        # Calculate contributions for key_factors
        income_contribution = 0
        if user_data.get('income_verified', False):
            income_contribution = 60
            income_debt_ratio = user_data.get('income_debt_ratio', 0)
            if income_debt_ratio > 2:
                income_contribution += 50
            elif income_debt_ratio > 1:
                income_contribution += 25
        
        activity_contribution = 0
        if activity_regularity > 60:
            activity_contribution = 40
        elif activity_regularity > 30:
            activity_contribution = 20
        
        return {
            'success': True,
            'wallet_address': user_data.get('wallet_address'),
            'tiger_score': score,
            'tier': tier,
            'confidence_level': 0.7,
            'risk_category': self._get_risk_category(score),
            'key_factors': {
                'repayment_contribution': successful_repayments * 60 - defaults * 120,
                'vc_contribution': 80 if user_data.get('human_verified') else 0,
                'onchain_contribution': 60 if wallet_age > 180 and tx_count > 100 else 30,
                'income_contribution': income_contribution,
                'activity_regularity_contribution': activity_contribution,
                'behavioral_contribution': 20
            },
            'calculated_at': datetime.utcnow().isoformat(),
            'model_used': 'fallback'
        }
    
    def _get_tier(self, score: int) -> str:
        """Map score to tier"""
        if score >= 850:
            return "Diamond"
        elif score >= 700:
            return "Platinum"
        elif score >= 500:
            return "Gold"
        elif score >= 300:
            return "Silver"
        else:
            return "Bronze"
    
    def _get_risk_category(self, score: int) -> str:
        """Map score to risk category"""
        if score >= 850:
            return "Very Low"
        elif score >= 700:
            return "Low"
        elif score >= 500:
            return "Medium"
        elif score >= 300:
            return "Medium-High"
        else:
            return "High"
    
    def batch_score(self, users_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Calculate scores for multiple users in batch
        
        Args:
            users_data: List of user data dictionaries
        
        Returns:
            List of scoring results
        """
        results = []
        for user_data in users_data:
            try:
                result = self.calculate_score(user_data)
                results.append(result)
            except Exception as e:
                logger.error(f"Error scoring wallet {user_data.get('wallet_address')}: {e}")
                results.append({
                    'wallet_address': user_data.get('wallet_address'),
                    'error': str(e),
                    'tiger_score': 0,
                    'tier': 'Bronze'
                })
        
        return results


def main():
    """Test the scoring system"""
    # Example user data
    test_user = {
        'wallet_address': '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        'wallet_age_days': 365,
        'tx_count': 250,
        'total_volume': 150.5,
        'nft_count': 5,
        'token_count': 12,
        'defi_protocols': ['Raydium', 'Jupiter', 'Marinade'],
        'human_verified': True,
        'education_vcs': ['University Degree VC'],
        'employment_vcs': [],
        'financial_vcs': [],
        'identity_level': 'KYC Level 2',
        'total_loans': 3,
        'successful_repayments': 3,
        'defaults': 0,
        'avg_repayment_days': 28,
        'total_borrowed': 50.0,
        'total_repaid': 52.5,
        'outstanding_debt': 0,
        'on_time_rate': 100,
        'recent_activity_score': 85,
        'network_score': 70,
        'smart_contract_count': 45,
        'anomaly_flags': []
    }
    
    scorer = TigerScoreAI()
    result = scorer.calculate_score(test_user)
    
    print("\n" + "="*60)
    print("TIGERTRUST AI SCORING RESULT")
    print("="*60)
    print(json.dumps(result, indent=2))
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
