#![allow(unused_imports)]
#![allow(clippy::too_many_arguments)]

use anchor_lang::prelude::*;

declare_id!("Fg6PaFprPzNkjg6nFkYfSjJ8i9xJ829YqB72G2384P");

const ADMIN_PUBKEY: Pubkey = Pubkey::new_from_array([
    222, 22, 218, 110, 46, 220, 196, 67, 253, 184, 216, 174, 187, 148, 13, 20,
    131, 158, 186, 82, 14, 103, 147, 13, 107, 189, 120, 49, 135, 108, 132, 128,
]);

const USER_PROFILE_SEED: &[u8] = b"user_profile";

#[program]
pub mod lending_controller {
    use super::*;

    pub fn initialize_user_profile(ctx: Context<InitializeUserProfile>) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.owner = ctx.accounts.signer.key();
        user_profile.did_address = user_profile.key();

        user_profile.tiger_score = 0;
        user_profile.level_up_tier = 0;
        user_profile.is_human_verified = false;
        user_profile.wallet_age_months = 0;
        user_profile.transaction_count = 0;
        user_profile.has_nft = false;
        user_profile.verified_credentials_count = 0;
        user_profile.has_income_verification = false;
        user_profile.activity_regularity_score = 0;
        user_profile.total_successful_repayments = 0;
        user_profile.total_defaulted_loans = 0;
        user_profile.on_chain_debt_balance = 0;
        user_profile.last_repayment_timestamp = 0;

        emit!(UserProfileInitialized {
            owner: ctx.accounts.signer.key(),
            user_profile_pda: user_profile.key(),
            did_address: user_profile.did_address,
        });

        Ok(())
    }

    pub fn update_human_verification(
        ctx: Context<UpdateHumanVerification>,
        is_verified: bool,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        require!(
            ctx.accounts.authority.key() == ADMIN_PUBKEY,
            ErrorCode::Unauthorized
        );

        user_profile.is_human_verified = is_verified;

        let new_score = calculate_full_tigerscore(user_profile);
        user_profile.tiger_score = new_score;
        user_profile.level_up_tier = calculate_new_tier(new_score);

        emit!(HumanVerificationUpdated {
            user_profile_pda: ctx.accounts.user_profile.key(),
            is_verified,
            new_tiger_score: new_score,
        });

        Ok(())
    }

    pub fn update_reputation_factors(
        ctx: Context<UpdateReputationFactors>,
        wallet_age_months: u8,
        transaction_count: u32,
        has_nft: bool,
        verified_credentials_count: u8,
        has_income_verification: bool,
        activity_regularity_score: u8,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        require!(
            ctx.accounts.authority.key() == ADMIN_PUBKEY,
            ErrorCode::Unauthorized
        );

        user_profile.wallet_age_months = wallet_age_months;
        user_profile.transaction_count = transaction_count;
        user_profile.has_nft = has_nft;
        user_profile.verified_credentials_count = verified_credentials_count;
        user_profile.has_income_verification = has_income_verification;
        user_profile.activity_regularity_score = activity_regularity_score.min(40);

        let new_score = calculate_full_tigerscore(user_profile);
        user_profile.tiger_score = new_score;
        user_profile.level_up_tier = calculate_new_tier(new_score);

        emit!(ReputationFactorsUpdated {
            user_profile_pda: user_profile.key(),
            new_tiger_score: new_score,
            new_level_up_tier: user_profile.level_up_tier,
        });

        Ok(())
    }

    pub fn update_tigerscore(
        ctx: Context<UpdateTigerScore>,
        new_score: u16,
        new_tier: u8,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        require!(
            ctx.accounts.authority.key() == ADMIN_PUBKEY,
            ErrorCode::Unauthorized
        );

        user_profile.tiger_score = new_score.min(660);
        user_profile.level_up_tier = new_tier;

        emit!(TigerScoreUpdated {
            user_profile_pda: ctx.accounts.user_profile.key(),
            new_score,
            new_tier,
        });

        Ok(())
    }
}

fn calculate_full_tigerscore(profile: &UserProfile) -> u16 {
    let mut score: u16 = 0;

    score = score.checked_add(300).unwrap_or(u16::MAX);
    score = score
        .checked_add(profile.total_successful_repayments.saturating_mul(60) as u16)
        .unwrap_or(u16::MAX);

    if profile.is_human_verified {
        score = score.checked_add(80).unwrap_or(u16::MAX);
    }

    if profile.wallet_age_months >= 6 {
        score = score.checked_add(40).unwrap_or(u16::MAX);
    }

    if profile.transaction_count >= 100 {
        score = score.checked_add(40).unwrap_or(u16::MAX);
    }

    if profile.has_nft {
        score = score.checked_add(20).unwrap_or(u16::MAX);
    }

    score = score
        .checked_add(
            profile
                .verified_credentials_count
                .saturating_mul(10)
                .min(30) as u16,
        )
        .unwrap_or(u16::MAX);

    if profile.has_income_verification {
        score = score.checked_add(110).unwrap_or(u16::MAX);
    }

    score = score
        .checked_add(profile.activity_regularity_score as u16)
        .unwrap_or(u16::MAX);

    score
}

fn calculate_new_tier(tiger_score: u16) -> u8 {
    if tiger_score >= 900 {
        5
    } else if tiger_score >= 700 {
        4
    } else if tiger_score >= 500 {
        3
    } else if tiger_score >= 200 {
        2
    } else if tiger_score >= 50 {
        1
    } else {
        0
    }
}

#[derive(Accounts)]
pub struct InitializeUserProfile<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [USER_PROFILE_SEED, signer.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateHumanVerification<'info> {
    #[account(mut, seeds = [USER_PROFILE_SEED, user_profile.owner.key().as_ref()], bump)]
    pub user_profile: Account<'info, UserProfile>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateReputationFactors<'info> {
    #[account(mut, seeds = [USER_PROFILE_SEED, user_profile.owner.key().as_ref()], bump)]
    pub user_profile: Account<'info, UserProfile>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateTigerScore<'info> {
    #[account(mut, seeds = [USER_PROFILE_SEED, user_profile.owner.key().as_ref()], bump)]
    pub user_profile: Account<'info, UserProfile>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub owner: Pubkey,
    pub did_address: Pubkey,
    pub tiger_score: u16,
    pub level_up_tier: u8,
    pub is_human_verified: bool,
    pub wallet_age_months: u8,
    pub transaction_count: u32,
    pub has_nft: bool,
    pub verified_credentials_count: u8,
    pub has_income_verification: bool,
    pub activity_regularity_score: u8,
    pub total_successful_repayments: u32,
    pub total_defaulted_loans: u32,
    pub on_chain_debt_balance: u64,
    pub last_repayment_timestamp: i64,
}

#[event]
pub struct UserProfileInitialized {
    pub owner: Pubkey,
    pub user_profile_pda: Pubkey,
    pub did_address: Pubkey,
}

#[event]
pub struct HumanVerificationUpdated {
    pub user_profile_pda: Pubkey,
    pub is_verified: bool,
    pub new_tiger_score: u16,
}

#[event]
pub struct ReputationFactorsUpdated {
    pub user_profile_pda: Pubkey,
    pub new_tiger_score: u16,
    pub new_level_up_tier: u8,
}

#[event]
pub struct TigerScoreUpdated {
    pub user_profile_pda: Pubkey,
    pub new_score: u16,
    pub new_tier: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("UserProfile already exists")]
    UserProfileAlreadyExists,
}