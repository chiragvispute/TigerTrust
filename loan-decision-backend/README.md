# TigerTrust Backend Module 3: Loan Application & Decision

A comprehensive Node.js backend service for TigerTrust's loan application and real-time decision engine. This module processes loan requests, evaluates borrower eligibility based on on-chain data, and generates proposed loan terms without executing blockchain transactions.

## 🌟 Features

- **Real-time Loan Decision Engine**: Instant eligibility assessment and term generation
- **Multi-tier Risk Assessment**: Dynamic loan limits and rates based on TigerScore
- **Debt-to-Income Analysis**: Comprehensive DTI calculation using on-chain loan data
- **Solana Integration**: Direct PDA reading for user profiles and loan accounts
- **RESTful API**: Clean endpoints for loan applications and eligibility checks
- **Comprehensive Validation**: Input validation, error handling, and detailed feedback

## 🏗️ Architecture

This backend module integrates with:
- **Module 1**: Reads User Profile PDAs (identity verification data)
- **Module 2**: Uses TigerScore from Risk Scoring Engine
- **Solana Blockchain**: Direct PDA interaction via @solana/web3.js

## 📋 Prerequisites

- Node.js 16+ and npm
- Access to Solana devnet/mainnet
- User Profile Program ID (from Module 1)
- Loan Account Program ID (optional, for DTI calculations)

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd loan-decision-backend
npm install
```

### 2. Configure Environment

Create and configure `.env` file:

```bash
# Copy the example and update with your program IDs
cp .env .env.local

# Edit .env with your actual program IDs
SOLANA_RPC_URL=https://api.devnet.solana.com
USER_PROFILE_PROGRAM_ID=YOUR_USER_PROFILE_PROGRAM_ID_HERE
LOAN_ACCOUNT_PROGRAM_ID=YOUR_LOAN_ACCOUNT_PROGRAM_ID_HERE
PORT=3002
```

**⚠️ Important**: Replace the placeholder program IDs with your actual deployed program IDs from Module 1.

### 3. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start at `http://localhost:3002` with the following endpoints available.

## 📡 API Endpoints

### 1. Apply for Loan
**POST** `/api/loan/apply`

Submit a loan application for real-time decision.

**Request Body:**
```json
{
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuQwxdmF",
  "loanAmount": 100,
  "repaymentTerm": "30_days"
}
```

**Success Response:**
```json
{
  "success": true,
  "proposedTerms": {
    "approvedAmount": 100,
    "interestRate": 10,
    "repaymentDays": 30,
    "totalRepaymentAmount": 108.22,
    "dailyPayment": 3.61,
    "tier": {
      "level": 1,
      "description": "Intermediate borrower. Higher limits, lower rates."
    },
    "borrowerInfo": {
      "tigerScore": 250,
      "verifiedIncome": 325,
      "currentDti": 12.3,
      "outstandingDebt": 40
    }
  }
}
```

**Rejection Response:**
```json
{
  "success": false,
  "rejectionReason": "High Debt-to-Income Ratio (45.2%). Maximum allowed: 30.0%"
}
```

### 2. Check Eligibility
**GET** `/api/loan/eligibility/:walletAddress`

Get loan eligibility and maximum amounts without applying.

**Response:**
```json
{
  "success": true,
  "eligibility": {
    "tigerScore": 250,
    "maxEligibleAmount": 150,
    "tier": {
      "level": 1,
      "minTigerScore": 200,
      "maxLoanLimit": 150,
      "baseInterestRate": 10
    },
    "verifiedIncome": 325,
    "isEligible": true
  }
}
```

### 3. Get Loan Tiers
**GET** `/api/loan/tiers`

Retrieve all available loan tiers and repayment terms.

### 4. Health Check
**GET** `/api/health`

Server health status and configuration.

## 🎯 Testing with Postman

### Import Collection
1. Open Postman
2. Import the following requests:

**Loan Application Test:**
```
POST http://localhost:3002/api/loan/apply
Content-Type: application/json

{
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuQwxdmF",
  "loanAmount": 100,
  "repaymentTerm": "30_days"
}
```

**Eligibility Check:**
```
GET http://localhost:3002/api/loan/eligibility/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuQwxdmF
```

**Tiers Information:**
```
GET http://localhost:3002/api/loan/tiers
```

### Expected Test Scenarios

1. **Successful Application** - Valid wallet with good TigerScore
2. **Profile Not Found** - Wallet without UserProfile PDA
3. **Insufficient TigerScore** - New user with low score
4. **High DTI Rejection** - User with too much outstanding debt
5. **Invalid Input** - Malformed requests

## 🔧 Configuration

### Loan Tiers (config.js)

The system supports 4 default tiers:

| Tier | Min TigerScore | Max Loan | Interest Rate | Max DTI | Description |
|------|----------------|----------|---------------|---------|-------------|
| 0    | 0              | $50      | 15%           | 20%     | Entry-level micro-loan |
| 1    | 200            | $150     | 10%           | 30%     | Intermediate borrower |
| 2    | 400            | $500     | 7%            | 40%     | Trusted borrower |
| 3    | 600            | $1000    | 5%            | 50%     | Elite borrower |

### Repayment Terms

Available terms: `7_days`, `15_days`, `30_days`, `60_days`, `90_days`

## 🏗️ Schema Compatibility

### UserProfile Schema (Borsh)
```javascript
{
  tigerScore: 'u64',
  levelUpTier: 'u8', 
  did: 'string',
  humanVerifiedVcHash: [32], // [u8; 32]
  createdAt: 'u64',
  updatedAt: 'u64'
}
```

### LoanAccount Schema (Conceptual)
```javascript
{
  loanId: 'string',
  borrower: 'publicKey',
  amount: 'u64',
  outstandingAmount: 'u64', 
  interestRate: 'u8',
  repaymentDueDate: 'u64',
  status: 'u8', // 0=active, 1=repaid, 2=defaulted
  incomeProofVcHash: [32],
  createdAt: 'u64'
}
```

**⚠️ Critical**: These schemas MUST match your Rust program structs exactly.

## 🧪 Development Notes

### Mock Data for Hackathon
- **Verified Income**: Derived from TigerScore (base $200 + score * 0.5)
- **Application Velocity**: Random number for demo purposes
- **Outstanding Loans**: May return empty if LOAN_ACCOUNT_PROGRAM_ID not set

### Production Considerations
- Replace mock income calculation with actual VC parsing
- Implement proper application velocity tracking
- Add database persistence for loan applications
- Enhance error logging and monitoring
- Add rate limiting and authentication

## 🐛 Troubleshooting

### Common Issues

**"User profile not found"**
- Ensure USER_PROFILE_PROGRAM_ID is correct
- Verify the wallet has completed Module 1 verification
- Check Solana RPC connectivity

**"Invalid wallet address"**
- Validate wallet address format
- Ensure it's a valid Solana PublicKey

**Connection errors**
- Check SOLANA_RPC_URL in .env
- Verify network connectivity
- Consider using different RPC endpoint

### Debug Mode
Enable detailed logging:
```bash
DEBUG=* npm run dev
```

## 🔗 Integration

This module is designed to integrate with:
- **Frontend**: Accept loan applications from UI
- **Module 4**: Pass approved terms to loan disbursement
- **Analytics**: Log application patterns and approval rates

## 📄 License

MIT License - See LICENSE file for details

---

**Next Steps**: Once this backend is tested and working, integrate it with your frontend loan application UI and connect to Module 4 for actual loan disbursement on Solana.