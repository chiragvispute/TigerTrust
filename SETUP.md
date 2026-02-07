# TigerTrust - Environment Setup Guide

This project now uses a **unified `.env` file** at the root level for all services, making configuration simpler and more maintainable.

## Quick Start

### 1. Copy the Environment Template

```bash
cp .env.example .env
```

### 2. Configure Required API Keys

Edit `.env` and add your API keys:

#### **Required for AI Scoring (Port 5001)**
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
- Get from: https://makersuite.google.com/app/apikey
- Used for AI-powered credit scoring

#### **Required for Human Verification (Port 5000)**
```env
FACEPP_API_KEY=your_facepp_api_key_here
FACEPP_API_SECRET=your_facepp_api_secret_here
```
- Get from: https://console.faceplusplus.com/
- Used for facial verification/liveness detection

#### **Required for RSE Server (Port 4000)**
```env
HELIUS_KEY=your_helius_api_key_here
```
- Get from: https://www.helius.dev/
- Used for enhanced Solana RPC and asset data

#### **Required for Solana Integration**
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
```
- Can use devnet (default), testnet, or mainnet
- Or use Helius RPC for better performance

### 3. Deploy Solana Programs (Optional)

If you're using the on-chain features:

```bash
cd anchor
anchor build
anchor deploy
```

Then add your program IDs to `.env`:
```env
TIGERTRUST_PROGRAM_ID=<your_program_id>
USER_PROFILE_PROGRAM_ID=<your_program_id>
LOAN_ACCOUNT_PROGRAM_ID=<your_program_id>
```

### 4. Install Dependencies

```bash
# Install Python dependencies for AI Scoring
cd ai_scoring
pip install -r requirements.txt
cd ..

# Install Python dependencies for Human Verification
cd human_verification
pip install -r requirements.txt
cd ..

# Install Node.js dependencies for RSE Server
cd rse-server
npm install
cd ..

# Install Node.js dependencies for Loan Decision Backend
cd loan-decision-backend
npm install
cd ..

# Install Next.js frontend dependencies
npm install
```

### 5. Start All Services

#### Option A: Use the Unified Startup Script (Recommended)
```bash
python start_backends.py
```

This starts:
- AI Scoring Backend (Port 5001)
- Human Verification Backend (Port 5000)
- RSE Server (Port 4000)
- Loan Decision Backend (Port 3002)

#### Option B: Start Services Individually

**Terminal 1 - AI Scoring:**
```bash
cd ai_scoring
python api.py
```

**Terminal 2 - Human Verification:**
```bash
cd human_verification
python app.py
```

**Terminal 3 - RSE Server:**
```bash
cd rse-server
npm run dev
```

**Terminal 4 - Loan Decision Backend:**
```bash
cd loan-decision-backend
node server.js
```

**Terminal 5 - Next.js Frontend:**
```bash
npm run dev
```

## Environment Variables Reference

### 🔐 API Keys & Secrets
| Variable | Service | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | AI Scoring | Google Gemini API for AI scoring |
| `FACEPP_API_KEY` | Human Verification | Face++ API key |
| `FACEPP_API_SECRET` | Human Verification | Face++ API secret |
| `HELIUS_KEY` | RSE Server | Helius API for Solana data |

### ⛓️ Solana Configuration
| Variable | Description |
|----------|-------------|
| `SOLANA_RPC_URL` | Solana RPC endpoint (devnet/testnet/mainnet) |
| `TIGERTRUST_PROGRAM_ID` | Main TigerTrust program ID |
| `USER_PROFILE_PROGRAM_ID` | User profile program ID |
| `LOAN_ACCOUNT_PROGRAM_ID` | Loan account program ID |

### 🔧 Service Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `AI_SCORING_PORT` | 5001 | AI Scoring API port |
| `HUMAN_VERIFICATION_PORT` | 5000 | Human Verification API port |
| `RSE_SERVER_PORT` | 4000 | RSE Server port |
| `LOAN_DECISION_PORT` | 3002 | Loan Decision Backend port |

### 🤖 AI Scoring Settings
| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_MODEL` | gemini-2.0-flash | Gemini model to use |
| `SCORE_UPDATE_INTERVAL_HOURS` | 24 | Score update frequency |
| `MONITORED_WALLETS` | - | Comma-separated wallets to monitor |
| `LOG_LEVEL` | INFO | Logging level |

### 🌐 Frontend Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | http://localhost:5000 | Human verification API URL |
| `NEXT_PUBLIC_AI_SCORING_API` | http://localhost:5001 | AI scoring API URL |
| `NEXT_PUBLIC_RSE_SERVER_URL` | http://localhost:4000 | RSE server URL |
| `NEXT_PUBLIC_LOAN_DECISION_URL` | http://localhost:3002 | Loan decision API URL |

## Validation

Check if your configuration is correct:

```bash
cd ai_scoring
python validate_config.py
```

## Troubleshooting

### Services Won't Start
1. **Check .env file exists**: `ls -la .env` (Linux/Mac) or `dir .env` (Windows)
2. **Validate API keys**: Make sure all required keys are set
3. **Check ports**: Ensure ports 5000, 5001, 4000, 3002 are not in use

### Environment Variables Not Loading
- Services now automatically load from the root `.env` file
- If a service can't find environment variables, ensure you're starting it from the correct directory
- The startup script `start_backends.py` handles this automatically

### API Key Errors
- **Gemini API**: Verify key at https://makersuite.google.com/app/apikey
- **Face++**: Check credentials at https://console.faceplusplus.com/
- **Helius**: Verify key at https://www.helius.dev/

## Migration from Old Setup

If you previously had separate `.env` files in each service directory:

1. Copy values from old `.env` files to the root `.env`
2. Remove old `.env` files (optional - they're now ignored)
3. Use the new unified configuration

The services will automatically fall back to local `.env` files if they exist, but the root `.env` takes priority.

## Security Notes

⚠️ **Important:**
- Never commit `.env` to version control
- `.env` is already in `.gitignore`
- Share `.env.example` instead
- Rotate API keys regularly
- Use different keys for development and production

## Next Steps

After configuration:
1. Test each service individually using the health check endpoints
2. Run the validation script to ensure everything is configured correctly
3. Access the frontend at http://localhost:3000
4. Check service logs for any errors

## Support

For issues:
1. Check the logs of the specific service
2. Validate your `.env` configuration
3. Ensure all dependencies are installed
4. Review the README.md for additional context
