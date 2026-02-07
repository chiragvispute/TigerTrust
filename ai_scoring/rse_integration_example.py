"""
Direct RSE Integration Example
Shows how to use existing RSE server data with AI scoring
"""

import requests
import json


def score_from_rse_data(wallet_address: str):
    """
    Complete flow: RSE Server → AI Scoring → On-Chain Update
    Uses your existing RSE data structure
    """
    
    print(f"\n{'='*60}")
    print(f"Calculating AI Score for: {wallet_address}")
    print(f"{'='*60}\n")
    
    # Step 1: Get data from RSE Server (your existing endpoint)
    print("Step 1: Fetching data from RSE Server...")
    rse_response = requests.post(
        'http://localhost:4000/api/risk/recalculate',
        json={'wallet': wallet_address}
    )
    
    if rse_response.status_code != 200:
        print(f"❌ Error from RSE Server: {rse_response.status_code}")
        return None
    
    rse_data = rse_response.json()
    print(f"✅ RSE Score: {rse_data['score']} ({rse_data['tier']})")
    print(f"   Features: {json.dumps(rse_data['features_used'], indent=2)}")
    
    # Step 2: Transform RSE data to AI scoring format
    print("\nStep 2: Preparing data for AI scoring...")
    features = rse_data['features_used']
    
    ai_input = {
        'wallet_address': wallet_address,
        
        # Map directly from your RSE structure
        'wallet_age_days': features.get('walletAgeDays', 0),
        'tx_count': features.get('txCount', 0),
        'nft_count': features.get('nftCount', 0),
        'token_count': features.get('tokenCount', 0),
        'human_verified': features.get('humanVerified', False),
        'successful_repayments': features.get('successfulRepayments', 0),
        'defaults': features.get('defaults', 0),
        
        # Derived/Enhanced fields
        'has_vc': features.get('hasVC', False),
        'education_vcs': ['Education VC'] if features.get('hasVC') else [],
        'total_loans': features.get('successfulRepayments', 0) + features.get('defaults', 0),
        'on_time_rate': 100 if features.get('defaults', 0) == 0 else 50,
        
        # Optional fields with smart defaults
        'recent_activity_score': min(100, features.get('txCount', 0)),
        'smart_contract_count': features.get('txCount', 0) // 2,
    }
    
    print(f"✅ AI input prepared")
    
    # Step 3: Send to AI Scoring API
    print("\nStep 3: Calculating AI score with Gemini...")
    ai_response = requests.post(
        'http://localhost:5001/api/score/calculate-and-update',
        json=ai_input
    )
    
    if ai_response.status_code != 200:
        print(f"❌ Error from AI Scoring: {ai_response.status_code}")
        return None
    
    ai_result = ai_response.json()
    
    # Step 4: Display results
    print(f"\n{'='*60}")
    print(f"RESULTS")
    print(f"{'='*60}")
    print(f"\n📊 Traditional RSE Score: {rse_data['score']} ({rse_data['tier']})")
    print(f"🤖 AI-Enhanced Score:     {ai_result['tiger_score']} ({ai_result['tier']})")
    print(f"   Confidence:            {ai_result.get('confidence_level', 0)*100:.1f}%")
    print(f"   Risk Category:         {ai_result.get('risk_category', 'Unknown')}")
    
    print(f"\n💪 Strengths:")
    for strength in ai_result.get('strengths', [])[:3]:
        print(f"   • {strength}")
    
    if ai_result.get('weaknesses'):
        print(f"\n⚠️  Areas to Improve:")
        for weakness in ai_result.get('weaknesses', [])[:3]:
            print(f"   • {weakness}")
    
    if ai_result.get('on_chain_update', {}).get('success'):
        print(f"\n✅ On-Chain Update:")
        print(f"   Signature: {ai_result['on_chain_update']['signature'][:20]}...")
    
    print(f"\n{'='*60}\n")
    
    return ai_result


def quick_calculate(wallet_address: str):
    """
    Quick calculation without on-chain update
    Perfect for frontend display
    """
    print(f"Quick calculating score for {wallet_address}...")
    
    # Get RSE data
    rse_response = requests.post(
        'http://localhost:4000/api/risk/recalculate',
        json={'wallet': wallet_address}
    )
    
    if rse_response.status_code != 200:
        return None
    
    rse_data = rse_response.json()
    features = rse_data['features_used']
    
    # Calculate AI score (no blockchain update)
    ai_response = requests.post(
        'http://localhost:5001/api/score/calculate',
        json={
            'wallet_address': wallet_address,
            'wallet_age_days': features.get('walletAgeDays', 0),
            'tx_count': features.get('txCount', 0),
            'nft_count': features.get('nftCount', 0),
            'token_count': features.get('tokenCount', 0),
            'human_verified': features.get('humanVerified', False),
            'successful_repayments': features.get('successfulRepayments', 0),
            'defaults': features.get('defaults', 0),
        }
    )
    
    if ai_response.status_code == 200:
        result = ai_response.json()
        print(f"✅ Score: {result['tiger_score']} ({result['tier']})")
        return result
    else:
        print(f"❌ Error calculating score")
        return None


def handle_loan_event_example(wallet_address: str, loan_amount: float):
    """
    Example: User takes a loan, trigger score recalculation
    """
    print(f"\n🏦 Loan Event: {wallet_address} borrowed {loan_amount} SOL")
    
    response = requests.post(
        'http://localhost:5001/api/trigger/recalculate',
        json={
            'wallet_address': wallet_address,
            'event_type': 'loan_taken',
            'event_data': {
                'amount': loan_amount
            }
        }
    )
    
    if response.status_code in [200, 202]:
        print(f"✅ Recalculation triggered successfully")
        return response.json()
    else:
        print(f"❌ Failed to trigger recalculation")
        return None


def handle_repayment_event_example(wallet_address: str, repayment_amount: float):
    """
    Example: User repays a loan, boost their score
    """
    print(f"\n💰 Repayment Event: {wallet_address} repaid {repayment_amount} SOL")
    
    response = requests.post(
        'http://localhost:5001/api/trigger/recalculate',
        json={
            'wallet_address': wallet_address,
            'event_type': 'repayment',
            'event_data': {
                'amount': repayment_amount
            }
        }
    )
    
    if response.status_code in [200, 202]:
        print(f"✅ Score will be updated shortly")
        return response.json()
    else:
        print(f"❌ Failed to trigger update")
        return None


if __name__ == "__main__":
    # Example usage
    test_wallet = "4Du8GKHMaSevJqH5V7kvKy6J5GVbgC8cSuJnXBRqh2Ya"
    
    print("\n" + "="*60)
    print("TigerTrust RSE → AI Scoring Integration Example")
    print("="*60)
    
    # Full flow with on-chain update
    result = score_from_rse_data(test_wallet)
    
    # Or just quick calculation for display
    # result = quick_calculate(test_wallet)
    
    # Event examples
    # handle_loan_event_example(test_wallet, 5.0)
    # handle_repayment_event_example(test_wallet, 5.5)
