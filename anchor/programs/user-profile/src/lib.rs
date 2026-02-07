use anchor_lang::prelude::*;

declare_id!("3FgL6wsAvfy1zNsnXmq13BLd6stXzSPWFvDjK5k2nCMZ");



#[program]
pub mod user_profile {
    use super::*;
    
    pub fn create_profile(/* your implementation */) -> Result<()> {
        // Implementation
        Ok(())
    }
}

#[account]
pub struct UserProfile {
    pub tiger_score: u64,
    pub level_up_tier: u8,
    pub did: String,
    pub human_verified_vc_hash: [u8; 32],
    pub created_at: u64,
    pub updated_at: u64,
}
