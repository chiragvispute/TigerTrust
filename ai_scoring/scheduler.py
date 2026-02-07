"""
TigerTrust Scheduler Service
Runs periodic score updates and event-driven recalculations
"""

import asyncio
import logging
import os
import json
from datetime import datetime
from typing import List, Dict, Any
from dotenv import load_dotenv
from pathlib import Path

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
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format=os.getenv('LOG_FORMAT', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
)
logger = logging.getLogger(__name__)


class TigerTrustScheduler:
    """Scheduler for periodic and event-driven TigerScore updates"""
    
    def __init__(self):
        self.updater = None
        self.update_interval_hours = int(os.getenv('SCORE_UPDATE_INTERVAL_HOURS', 24))
        self.monitored_wallets: List[str] = []
        self.running = False
        
        logger.info("TigerTrust Scheduler initialized")
        logger.info(f"Update interval: {self.update_interval_hours} hours")
    
    async def initialize(self):
        """Initialize the updater"""
        self.updater = TigerScoreUpdater()
        logger.info("Scheduler ready")
    
    def add_wallet(self, wallet_address: str):
        """Add a wallet to monitoring list"""
        if wallet_address not in self.monitored_wallets:
            self.monitored_wallets.append(wallet_address)
            logger.info(f"Added wallet to monitoring: {wallet_address}")
    
    def remove_wallet(self, wallet_address: str):
        """Remove a wallet from monitoring list"""
        if wallet_address in self.monitored_wallets:
            self.monitored_wallets.remove(wallet_address)
            logger.info(f"Removed wallet from monitoring: {wallet_address}")
    
    async def update_single_wallet(self, wallet_address: str) -> Dict[str, Any]:
        """
        Update score for a single wallet
        
        Args:
            wallet_address: Wallet to update
        
        Returns:
            Update result
        """
        try:
            # Fetch current profile
            profile = await self.updater.fetch_user_profile(wallet_address)
            
            if not profile:
                logger.warning(f"No profile found for {wallet_address}")
                return {
                    'wallet_address': wallet_address,
                    'success': False,
                    'error': 'Profile not found'
                }
            
            # Aggregate user data
            user_data = await self.updater._aggregate_user_data(wallet_address, profile)
            
            # Calculate and update
            result = await self.updater.calculate_and_update(wallet_address, user_data)
            
            if result.get('on_chain_update', {}).get('success'):
                logger.info(
                    f"✓ Updated {wallet_address}: "
                    f"Score {result['tiger_score']} ({result['tier']})"
                )
            else:
                logger.error(f"✗ Failed to update {wallet_address}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error updating {wallet_address}: {e}")
            return {
                'wallet_address': wallet_address,
                'success': False,
                'error': str(e)
            }
    
    async def periodic_update_cycle(self):
        """Run a single update cycle for all monitored wallets"""
        if not self.monitored_wallets:
            logger.warning("No wallets to monitor")
            return
        
        logger.info(f"Starting update cycle for {len(self.monitored_wallets)} wallets")
        start_time = datetime.utcnow()
        
        results = {
            'success': 0,
            'failed': 0,
            'total': len(self.monitored_wallets)
        }
        
        for wallet in self.monitored_wallets:
            result = await self.update_single_wallet(wallet)
            
            if result.get('success') or result.get('on_chain_update', {}).get('success'):
                results['success'] += 1
            else:
                results['failed'] += 1
            
            # Small delay between updates to avoid rate limits
            await asyncio.sleep(2)
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(
            f"Update cycle complete: "
            f"{results['success']}/{results['total']} successful "
            f"({results['failed']} failed) in {duration:.1f}s"
        )
    
    async def run_scheduler(self):
        """Main scheduler loop"""
        self.running = True
        logger.info("Scheduler started")
        
        while self.running:
            try:
                # Run update cycle
                await self.periodic_update_cycle()
                
                # Calculate next update time
                next_update = datetime.utcnow()
                next_update = next_update.replace(
                    hour=(next_update.hour + self.update_interval_hours) % 24,
                    minute=0,
                    second=0
                )
                
                logger.info(f"Next update scheduled for: {next_update.isoformat()}")
                
                # Wait for next cycle
                await asyncio.sleep(self.update_interval_hours * 3600)
                
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                # Wait a bit before retrying
                await asyncio.sleep(60)
    
    async def handle_event(
        self,
        wallet_address: str,
        event_type: str,
        event_data: Dict[str, Any] = None
    ):
        """
        Handle an event-driven score update
        
        Args:
            wallet_address: Wallet that triggered the event
            event_type: Type of event (loan_taken, repayment, default, etc.)
            event_data: Additional event data
        """
        logger.info(f"Event received: {event_type} for {wallet_address}")
        
        # Add wallet to monitoring if not already present
        self.add_wallet(wallet_address)
        
        # Trigger immediate update
        result = await self.update_single_wallet(wallet_address)
        
        return result
    
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        logger.info("Scheduler stopped")
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.updater:
            await self.updater.close()


async def main():
    """Run the scheduler"""
    scheduler = TigerTrustScheduler()
    await scheduler.initialize()
    
    # Load wallets from config or database
    # For demo, add some test wallets
    test_wallets = os.getenv('MONITORED_WALLETS', '').split(',')
    test_wallets = [w.strip() for w in test_wallets if w.strip()]
    
    if test_wallets:
        for wallet in test_wallets:
            scheduler.add_wallet(wallet)
    else:
        logger.warning("No wallets specified in MONITORED_WALLETS environment variable")
        logger.info("Add wallets via API or set MONITORED_WALLETS in .env")
    
    try:
        # Run scheduler
        await scheduler.run_scheduler()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    finally:
        scheduler.stop()
        await scheduler.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
