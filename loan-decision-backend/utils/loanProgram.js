const { PublicKey, Connection } = require('@solana/web3.js');
const borsh = require('borsh');
require('dotenv').config();

// Program IDs from environment variables
const USER_PROFILE_PROGRAM_ID = process.env.USER_PROFILE_PROGRAM_ID;
const LOAN_ACCOUNT_PROGRAM_ID = process.env.LOAN_ACCOUNT_PROGRAM_ID;

/**
 * UserProfile class with borsh schema
 * This must match exactly with the Rust struct in your Solana program
 */
class UserProfile {
  constructor(properties) {
    this.tigerScore = properties.tigerScore;
    this.levelUpTier = properties.levelUpTier;
    this.did = properties.did;
    this.humanVerifiedVcHash = properties.humanVerifiedVcHash;
    this.createdAt = properties.createdAt;
    this.updatedAt = properties.updatedAt;
  }
}

const USER_PROFILE_SCHEMA = new Map([
  [UserProfile, {
    kind: 'struct',
    fields: [
      ['tigerScore', 'u64'],
      ['levelUpTier', 'u8'],
      ['did', 'string'],
      ['humanVerifiedVcHash', [32]], // [u8; 32]
      ['createdAt', 'u64'],
      ['updatedAt', 'u64']
    ]
  }]
]);

/**
 * LoanAccount class with borsh schema (conceptual for DTI calculation)
 * This is a conceptual implementation - adjust according to your actual Rust struct
 */
class LoanAccount {
  constructor(properties) {
    this.loanId = properties.loanId;
    this.borrower = properties.borrower;
    this.amount = properties.amount;
    this.outstandingAmount = properties.outstandingAmount;
    this.interestRate = properties.interestRate;
    this.repaymentDueDate = properties.repaymentDueDate;
    this.status = properties.status; // 0=active, 1=repaid, 2=defaulted
    this.incomeProofVcHash = properties.incomeProofVcHash;
    this.createdAt = properties.createdAt;
  }
}

const LOAN_ACCOUNT_SCHEMA = new Map([
  [LoanAccount, {
    kind: 'struct',
    fields: [
      ['loanId', 'string'],
      ['borrower', 'publicKey'],
      ['amount', 'u64'],
      ['outstandingAmount', 'u64'],
      ['interestRate', 'u8'],
      ['repaymentDueDate', 'u64'],
      ['status', 'u8'],
      ['incomeProofVcHash', [32]], // [u8; 32]
      ['createdAt', 'u64']
    ]
  }]
]);

/**
 * Find UserProfile PDA for a given wallet
 * @param {PublicKey} walletPublicKey 
 * @returns {Promise<[PublicKey, number]>}
 */
async function findUserProfilePDA(walletPublicKey) {
  if (!USER_PROFILE_PROGRAM_ID) {
    throw new Error('USER_PROFILE_PROGRAM_ID not set in environment variables');
  }
  
  return await PublicKey.findProgramAddress(
    [
      Buffer.from('user_profile'),
      walletPublicKey.toBuffer()
    ],
    new PublicKey(USER_PROFILE_PROGRAM_ID)
  );
}

/**
 * Find LoanAccount PDAs for a given borrower (conceptual implementation)
 * @param {PublicKey} borrowerPublicKey 
 * @returns {Promise<PublicKey[]>}
 */
async function findLoanAccountPDAs(borrowerPublicKey) {
  if (!LOAN_ACCOUNT_PROGRAM_ID) {
    console.log('LOAN_ACCOUNT_PROGRAM_ID not set - returning empty array');
    return [];
  }

  const loanAccounts = [];
  const programId = new PublicKey(LOAN_ACCOUNT_PROGRAM_ID);
  
  // Try to find loan accounts with different seeds/indices
  // This is conceptual - adjust based on your actual PDA derivation logic
  for (let i = 0; i < 10; i++) {
    try {
      const [pda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('loan'),
          borrowerPublicKey.toBuffer(),
          Buffer.from(i.toString())
        ],
        programId
      );
      loanAccounts.push(pda);
    } catch (error) {
      // Skip invalid PDAs
      continue;
    }
  }
  
  return loanAccounts;
}

/**
 * Fetch and deserialize UserProfile PDA
 * @param {Connection} connection 
 * @param {PublicKey} walletPublicKey 
 * @returns {Promise<UserProfile|null>}
 */
async function getUserProfile(connection, walletPublicKey) {
  try {
    const [userProfilePDA] = await findUserProfilePDA(walletPublicKey);
    const accountInfo = await connection.getAccountInfo(userProfilePDA);
    
    if (!accountInfo || !accountInfo.data) {
      return null;
    }
    
    return borsh.deserialize(USER_PROFILE_SCHEMA, UserProfile, accountInfo.data);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Fetch outstanding loans for a borrower (conceptual implementation)
 * @param {Connection} connection 
 * @param {PublicKey} borrowerPublicKey 
 * @returns {Promise<LoanAccount[]>}
 */
async function getOutstandingLoans(connection, borrowerPublicKey) {
  try {
    const loanAccountPDAs = await findLoanAccountPDAs(borrowerPublicKey);
    const outstandingLoans = [];
    
    for (const pda of loanAccountPDAs) {
      try {
        const accountInfo = await connection.getAccountInfo(pda);
        if (accountInfo && accountInfo.data) {
          const loanAccount = borsh.deserialize(LOAN_ACCOUNT_SCHEMA, LoanAccount, accountInfo.data);
          
          // Only include active loans (status = 0)
          if (loanAccount.status === 0 && loanAccount.outstandingAmount > 0) {
            outstandingLoans.push(loanAccount);
          }
        }
      } catch (error) {
        // Skip accounts that can't be deserialized
        continue;
      }
    }
    
    return outstandingLoans;
  } catch (error) {
    console.error('Error fetching outstanding loans:', error);
    return [];
  }
}

/**
 * Mock function to get verified income from profile
 * In a real implementation, this would parse VCs or connect to income verification oracle
 * @param {UserProfile} profile 
 * @returns {number} Monthly income in USD
 */
function getVerifiedIncome(profile) {
  // For hackathon/demo purposes, derive income from TigerScore
  // In reality, this would come from verified credentials or external oracle
  if (!profile || !profile.humanVerifiedVcHash) {
    return 0;
  }
  
  // Mock calculation: Base income + TigerScore bonus
  // Higher TigerScore indicates higher verified income capability
  const baseIncome = 200; // $200 base monthly income assumption
  const scoreBonus = Math.floor(profile.tigerScore * 0.5); // 0.5 USD per TigerScore point
  
  return Math.min(baseIncome + scoreBonus, 10000); // Cap at $10,000 for demo
}

module.exports = {
  USER_PROFILE_PROGRAM_ID,
  LOAN_ACCOUNT_PROGRAM_ID,
  UserProfile,
  LoanAccount,
  USER_PROFILE_SCHEMA,
  LOAN_ACCOUNT_SCHEMA,
  findUserProfilePDA,
  findLoanAccountPDAs,
  getUserProfile,
  getOutstandingLoans,
  getVerifiedIncome
};