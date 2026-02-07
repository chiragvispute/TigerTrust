"""
TigerTrust Integration Service
Connects RSE server with AI scoring and blockchain updates
"""

import requests
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class TigerTrustIntegration:
    """Integration layer between RSE and AI scoring"""
    
    def __init__(
        self,
        rse_server_url: str = "http://localhost:4000",
        ai_scoring_url: str = "http://localhost:5001"
    ):
        self.rse_server_url = rse_server_url
        self.ai_scoring_url = ai_scoring_url
        logger.info(f"Integration initialized - RSE: {rse_server_url}, AI: {ai_scoring_url}")
    
    def fetch_wallet_features(self, wallet_address: str) -> Dict[str, Any]:
        """
        Fetch wallet features from RSE server
        
        Args:
            wallet_address: Wallet to analyze
        
        Returns:
            Wallet features dictionary
        """
        try:
            response = requests.post(
                f"{self.rse_server_url}/api/risk/recalculate",
                json={"wallet": wallet_address},
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"RSE server error: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching wallet features: {e}")
            return None
    
    def calculate_ai_score(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Calculate TigerScore using AI service
        
        Args:
            user_data: Comprehensive user data
        
        Returns:
            Scoring result or None if failed
        """
        try:
            response = requests.post(
                f"{self.ai_scoring_url}/api/score/calculate",
                json=user_data,
                timeout=60
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"AI scoring error: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error calculating AI score: {e}")
            return None
    
    def calculate_and_update_score(
        self,
        user_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Calculate score and update on-chain
        
        Args:
            user_data: Comprehensive user data
        
        Returns:
            Combined result or None if failed
        """
        try:
            response = requests.post(
                f"{self.ai_scoring_url}/api/score/calculate-and-update",
                json=user_data,
                timeout=60
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"AI scoring/update error: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error in calculate and update: {e}")
            return None
    
    def full_wallet_analysis(
        self,
        wallet_address: str,
        additional_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Perform full wallet analysis combining RSE and AI scoring
        
        Args:
            wallet_address: Wallet to analyze
            additional_data: Additional data (VCs, repayment history, etc.)
        
        Returns:
            Complete analysis result
        """
        logger.info(f"Starting full analysis for wallet: {wallet_address}")
        
        # Step 1: Fetch on-chain features from RSE
        rse_data = self.fetch_wallet_features(wallet_address)
        
        if not rse_data:
            return {
                'success': False,
                'error': 'Failed to fetch wallet features from RSE server',
                'wallet_address': wallet_address
            }
        
        # Step 2: Build comprehensive user data from RSE response
        features = rse_data.get('features_used', {})
        
        user_data = {
            'wallet_address': wallet_address,
            'wallet_age_days': features.get('walletAgeDays', 0),
            'tx_count': features.get('txCount', 0),
            'nft_count': features.get('nftCount', 0),
            'token_count': features.get('tokenCount', 0),
            'human_verified': features.get('humanVerified', False),
            'has_vc': features.get('hasVC', False),
            'successful_repayments': features.get('successfulRepayments', 0),
            'defaults': features.get('defaults', 0),
            
            # Enhanced fields (will be populated if available in additional_data)
            'total_loans': 0,
            'on_time_rate': 100 if features.get('defaults', 0) == 0 else 50,
            'total_volume': 0,
            'defi_protocols': [],
            'education_vcs': [] if not features.get('hasVC') else ['Education VC'],
            'employment_vcs': [],
            'financial_vcs': [],
            'identity_level': 'Verified' if features.get('humanVerified') else 'None',
            'avg_repayment_days': 0,
            'total_borrowed': 0,
            'total_repaid': 0,
            'outstanding_debt': 0,
            'recent_activity_score': min(100, features.get('txCount', 0)),
            'network_score': 50,
            'smart_contract_count': features.get('txCount', 0) // 2,
            'anomaly_flags': []
        }
        
        # Merge additional data if provided
        if additional_data:
            user_data.update(additional_data)
        
        # Step 3: Calculate AI score and update on-chain
        ai_result = self.calculate_and_update_score(user_data)
        
        if not ai_result:
            # Fallback: just calculate without updating
            ai_result = self.calculate_ai_score(user_data)
        
        # Step 4: Combine results
        return {
            'success': True,
            'wallet_address': wallet_address,
            'timestamp': datetime.utcnow().isoformat(),
            'rse_analysis': {
                'score': rse_data.get('score', 0),
                'tier': rse_data.get('tier', 'Unknown'),
                'features': rse_data.get('features_used', {})
            },
            'ai_analysis': ai_result if ai_result else {'error': 'AI scoring failed'},
            'final_score': ai_result.get('tiger_score', 0) if ai_result else 0,
            'final_tier': ai_result.get('tier', 'Bronze') if ai_result else 'Bronze'
        }
    
    def handle_loan_event(
        self,
        wallet_address: str,
        loan_amount: float,
        loan_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Handle a new loan event and trigger score recalculation
        
        Args:
            wallet_address: Borrower's wallet
            loan_amount: Loan amount
            loan_data: Additional loan details
        
        Returns:
            Update result
        """
        logger.info(f"Handling loan event for {wallet_address}: {loan_amount}")
        
        # Trigger recalculation
        try:
            response = requests.post(
                f"{self.ai_scoring_url}/api/trigger/recalculate",
                json={
                    'wallet_address': wallet_address,
                    'event_type': 'loan_taken',
                    'event_data': {
                        'amount': loan_amount,
                        **(loan_data or {})
                    }
                },
                timeout=10
            )
            
            return response.json() if response.status_code in [200, 202] else {
                'success': False,
                'error': 'Failed to trigger recalculation'
            }
            
        except Exception as e:
            logger.error(f"Error handling loan event: {e}")
            return {'success': False, 'error': str(e)}
    
    def handle_repayment_event(
        self,
        wallet_address: str,
        repayment_amount: float,
        is_default: bool = False,
        repayment_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Handle a repayment event and trigger score recalculation
        
        Args:
            wallet_address: Borrower's wallet
            repayment_amount: Repayment amount
            is_default: Whether this is a default
            repayment_data: Additional repayment details
        
        Returns:
            Update result
        """
        event_type = 'default' if is_default else 'repayment'
        logger.info(f"Handling {event_type} event for {wallet_address}: {repayment_amount}")
        
        try:
            response = requests.post(
                f"{self.ai_scoring_url}/api/trigger/recalculate",
                json={
                    'wallet_address': wallet_address,
                    'event_type': event_type,
                    'event_data': {
                        'amount': repayment_amount,
                        'is_default': is_default,
                        **(repayment_data or {})
                    }
                },
                timeout=10
            )
            
            return response.json() if response.status_code in [200, 202] else {
                'success': False,
                'error': 'Failed to trigger recalculation'
            }
            
        except Exception as e:
            logger.error(f"Error handling repayment event: {e}")
            return {'success': False, 'error': str(e)}
    
    def handle_vc_issued_event(
        self,
        wallet_address: str,
        vc_type: str,
        vc_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Handle a VC issuance event and trigger score recalculation
        
        Args:
            wallet_address: User's wallet
            vc_type: Type of VC (education, employment, financial, identity)
            vc_data: VC details
        
        Returns:
            Update result
        """
        logger.info(f"Handling VC issued event for {wallet_address}: {vc_type}")
        
        try:
            response = requests.post(
                f"{self.ai_scoring_url}/api/trigger/recalculate",
                json={
                    'wallet_address': wallet_address,
                    'event_type': 'vc_issued',
                    'event_data': {
                        'vc_type': vc_type,
                        **(vc_data or {})
                    }
                },
                timeout=10
            )
            
            return response.json() if response.status_code in [200, 202] else {
                'success': False,
                'error': 'Failed to trigger recalculation'
            }
            
        except Exception as e:
            logger.error(f"Error handling VC event: {e}")
            return {'success': False, 'error': str(e)}


# Example usage
if __name__ == "__main__":
    integration = TigerTrustIntegration()
    
    # Test full analysis
    test_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
    
    result = integration.full_wallet_analysis(
        test_wallet,
        additional_data={
            'human_verified': True,
            'education_vcs': ['University Degree'],
            'total_loans': 2,
            'successful_repayments': 2,
            'defaults': 0
        }
    )
    
    print("\n" + "="*60)
    print("FULL WALLET ANALYSIS")
    print("="*60)
    import json
    print(json.dumps(result, indent=2))
    print("="*60 + "\n")
