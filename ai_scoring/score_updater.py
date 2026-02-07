"""
TigerScore Updater Service
Automated service that updates TigerScore and tier in the User Profile PDA on Solana
"""

import os
import json
import logging
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import ID as SYS_PROGRAM_ID
from solders.instruction import Instruction, AccountMeta
from solders.transaction import Transaction
from solders.message import Message
from anchorpy import Provider, Wallet
from dotenv import load_dotenv

from gemini_scorer import TigerScoreAI

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TigerScoreUpdater:
    """Service to update TigerScore in on-chain User Profile PDAs"""
    
    def __init__(
        self,
        rpc_url: str = None,
        program_id: str = None,
        authority_keypair: Optional[Keypair] = None
    ):
        """
        Initialize the updater service
        
        Args:
            rpc_url: Solana RPC endpoint
            program_id: TigerTrust program ID
            authority_keypair: Keypair with authority to update profiles
        """
        self.rpc_url = rpc_url or os.getenv('SOLANA_RPC_URL', 'https://api.devnet.solana.com')
        self.program_id = program_id or os.getenv('TIGERTRUST_PROGRAM_ID')
        
        if not self.program_id:
            raise ValueError("TIGERTRUST_PROGRAM_ID environment variable not set")
        
        # Initialize Solana client
        self.client = AsyncClient(self.rpc_url, commitment=Confirmed)
        
        # Initialize authority keypair
        if authority_keypair:
            self.authority = authority_keypair
        else:
            # Load from environment or create new
            private_key = os.getenv('AUTHORITY_PRIVATE_KEY')
            if private_key:
                self.authority = Keypair.from_base58_string(private_key)
            else:
                logger.warning("No authority keypair provided, creating temporary keypair")
                self.authority = Keypair()
        
        # Initialize AI scorer
        self.scorer = TigerScoreAI()
        
        logger.info(f"TigerScoreUpdater initialized")
        logger.info(f"RPC: {self.rpc_url}")
        logger.info(f"Program ID: {self.program_id}")
        logger.info(f"Authority: {self.authority.pubkey()}")
    
    async def get_user_profile_pda(self, wallet_address: str) -> tuple[Pubkey, int]:
        """
        Derive the User Profile PDA for a given wallet
        
        Args:
            wallet_address: User's wallet address
        
        Returns:
            Tuple of (PDA pubkey, bump seed)
        """
        wallet_pubkey = Pubkey.from_string(wallet_address)
        program_pubkey = Pubkey.from_string(self.program_id)
        
        # Derive PDA: ["user_profile", wallet_address]
        pda, bump = Pubkey.find_program_address(
            [b"user_profile", bytes(wallet_pubkey)],
            program_pubkey
        )
        
        return pda, bump
    
    async def fetch_user_profile(self, wallet_address: str) -> Optional[Dict[str, Any]]:
        """
        Fetch user profile data from on-chain PDA
        
        Args:
            wallet_address: User's wallet address
        
        Returns:
            User profile data or None if not found
        """
        try:
            pda, _ = await self.get_user_profile_pda(wallet_address)
            
            response = await self.client.get_account_info(pda)
            
            if not response.value:
                logger.warning(f"No user profile found for {wallet_address}")
                return None
            
            account_data = response.value.data
            
            # Parse account data (simplified - adjust based on your actual data structure)
            # This is a placeholder - you'll need to implement proper Anchor deserialization
            profile = self._deserialize_user_profile(account_data)
            
            return profile
            
        except Exception as e:
            logger.error(f"Error fetching user profile for {wallet_address}: {e}")
            return None
    
    def _deserialize_user_profile(self, data: bytes) -> Dict[str, Any]:
        """
        Deserialize user profile account data
        Note: This is a simplified version - implement proper Anchor deserialization
        """
        # TODO: Implement proper Anchor account deserialization
        # For now, return a mock structure
        return {
            'wallet_address': 'unknown',
            'tiger_score': 0,
            'tier': 0,
            'human_verified': False,
            'total_loans': 0,
            'successful_repayments': 0,
            'defaults': 0,
            'last_updated': 0
        }
    
    async def update_tiger_score(
        self,
        wallet_address: str,
        score: int,
        tier: str
    ) -> Dict[str, Any]:
        """
        Update TigerScore and tier in the on-chain User Profile PDA
        
        Args:
            wallet_address: User's wallet address
            score: New TigerScore (0-1000)
            tier: New tier (Bronze, Silver, Gold, Platinum, Diamond)
        
        Returns:
            Transaction result
        """
        try:
            wallet_pubkey = Pubkey.from_string(wallet_address)
            program_pubkey = Pubkey.from_string(self.program_id)
            pda, bump = await self.get_user_profile_pda(wallet_address)
            
            # Map tier to numeric value
            tier_map = {
                'Bronze': 0,
                'Silver': 1,
                'Gold': 2,
                'Platinum': 3,
                'Diamond': 4
            }
            tier_value = tier_map.get(tier, 0)
            
            # Build instruction data
            # Instruction discriminator + score (u16) + tier (u8)
            instruction_data = self._build_update_score_instruction(score, tier_value)
            
            # Create instruction
            instruction = Instruction(
                program_id=program_pubkey,
                accounts=[
                    AccountMeta(pubkey=pda, is_signer=False, is_writable=True),
                    AccountMeta(pubkey=wallet_pubkey, is_signer=False, is_writable=False),
                    AccountMeta(pubkey=self.authority.pubkey(), is_signer=True, is_writable=False),
                ],
                data=instruction_data
            )
            
            # Get recent blockhash
            blockhash_resp = await self.client.get_latest_blockhash()
            recent_blockhash = blockhash_resp.value.blockhash
            
            # Create and sign transaction
            message = Message.new_with_blockhash(
                [instruction],
                self.authority.pubkey(),
                recent_blockhash
            )
            transaction = Transaction([self.authority], message, recent_blockhash)
            
            # Send transaction
            tx_resp = await self.client.send_transaction(transaction)
            signature = tx_resp.value
            
            # Confirm transaction
            await self.client.confirm_transaction(signature, commitment=Confirmed)
            
            logger.info(f"TigerScore updated for {wallet_address}: {score} ({tier})")
            logger.info(f"Transaction: {signature}")
            
            return {
                'success': True,
                'signature': str(signature),
                'wallet_address': wallet_address,
                'score': score,
                'tier': tier,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error updating TigerScore for {wallet_address}: {e}")
            return {
                'success': False,
                'error': str(e),
                'wallet_address': wallet_address
            }
    
    def _build_update_score_instruction(self, score: int, tier: int) -> bytes:
        """
        Build instruction data for updating score
        Format: [discriminator (8 bytes), score (2 bytes), tier (1 byte)]
        """
        import struct
        
        # Instruction discriminator for 'update_tiger_score'
        # This should match your Anchor program's instruction discriminator
        discriminator = b'\x00' * 8  # Placeholder - calculate proper discriminator
        
        # Pack score (u16) and tier (u8)
        data = struct.pack('<HB', score, tier)
        
        return discriminator + data
    
    async def calculate_and_update(
        self,
        wallet_address: str,
        user_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate new TigerScore using AI and update on-chain
        
        Args:
            wallet_address: User's wallet address
            user_data: Comprehensive user data for scoring
        
        Returns:
            Combined result with score calculation and update status
        """
        try:
            # Calculate new score using AI
            logger.info(f"Calculating TigerScore for {wallet_address}")
            scoring_result = self.scorer.calculate_score(user_data)
            
            # Update on-chain
            logger.info(f"Updating on-chain profile for {wallet_address}")
            update_result = await self.update_tiger_score(
                wallet_address,
                scoring_result['tiger_score'],
                scoring_result['tier']
            )
            
            # Combine results
            return {
                **scoring_result,
                'on_chain_update': update_result
            }
            
        except Exception as e:
            logger.error(f"Error in calculate_and_update for {wallet_address}: {e}")
            return {
                'success': False,
                'error': str(e),
                'wallet_address': wallet_address
            }
    
    async def periodic_update_task(
        self,
        wallets: list[str],
        interval_hours: int = 24
    ):
        """
        Periodically update TigerScores for a list of wallets
        
        Args:
            wallets: List of wallet addresses to monitor
            interval_hours: Update interval in hours
        """
        logger.info(f"Starting periodic update task for {len(wallets)} wallets")
        logger.info(f"Update interval: {interval_hours} hours")
        
        while True:
            try:
                for wallet in wallets:
                    try:
                        # Fetch current profile
                        profile = await self.fetch_user_profile(wallet)
                        
                        if not profile:
                            logger.warning(f"Skipping {wallet} - profile not found")
                            continue
                        
                        # Build user data (you'll need to fetch this from various sources)
                        user_data = await self._aggregate_user_data(wallet, profile)
                        
                        # Calculate and update
                        result = await self.calculate_and_update(wallet, user_data)
                        
                        logger.info(f"Updated {wallet}: Score {result.get('tiger_score')}")
                        
                        # Small delay between updates
                        await asyncio.sleep(2)
                        
                    except Exception as e:
                        logger.error(f"Error updating {wallet}: {e}")
                        continue
                
                # Wait for next update cycle
                logger.info(f"Periodic update complete. Next update in {interval_hours} hours")
                await asyncio.sleep(interval_hours * 3600)
                
            except Exception as e:
                logger.error(f"Error in periodic update task: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    async def _aggregate_user_data(
        self,
        wallet_address: str,
        profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Aggregate all user data from various sources
        
        Args:
            wallet_address: User's wallet address
            profile: On-chain profile data
        
        Returns:
            Comprehensive user data dictionary
        """
        # TODO: Implement data aggregation from:
        # - Helius API (on-chain activity)
        # - VCs from User Profile PDA
        # - Repayment history
        # - DeFi protocol interactions
        
        # For now, return profile data
        return {
            'wallet_address': wallet_address,
            **profile,
            'wallet_age_days': 0,
            'tx_count': 0,
            'total_volume': 0,
            'nft_count': 0,
            'token_count': 0,
            'defi_protocols': [],
        }
    
    async def close(self):
        """Close the client connection"""
        await self.client.close()


async def main():
    """Test the updater service"""
    updater = TigerScoreUpdater()
    
    # Test wallet
    test_wallet = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
    
    # Test user data
    test_data = {
        'wallet_address': test_wallet,
        'wallet_age_days': 365,
        'tx_count': 250,
        'total_volume': 150.5,
        'nft_count': 5,
        'token_count': 12,
        'human_verified': True,
        'total_loans': 3,
        'successful_repayments': 3,
        'defaults': 0,
        'on_time_rate': 100,
    }
    
    try:
        # Calculate and update
        result = await updater.calculate_and_update(test_wallet, test_data)
        
        print("\n" + "="*60)
        print("TIGERSCORE UPDATE RESULT")
        print("="*60)
        print(json.dumps(result, indent=2))
        print("="*60 + "\n")
        
    finally:
        await updater.close()


if __name__ == "__main__":
    asyncio.run(main())
