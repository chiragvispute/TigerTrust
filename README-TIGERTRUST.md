# TigerTrust Frontend

A complete frontend-only Next.js application for TigerTrust - a simulated micro-lending platform powered by on-chain reputation and AI-driven trust assessment.

## 🚨 Important Static Assets Required

Before running the application, you **must** add the following SVG files to the `public/images/` directory:

1. `crypto-wallet-illustration.svg` - Used on the landing page hero section
2. `success-checkmark.svg` - Used on the identity verification success page

These files are referenced in the components but not included in the codebase.

## 🌟 Features

- **Landing Page**: Hero section with call-to-action buttons
- **Identity Verification Flow**: Multi-step onboarding simulation
- **Verification Success**: Confirmation page with user details
- **Responsive Design**: Built with Tailwind CSS
- **TigerTrust Branding**: Custom green color theme (#13724d)

## 🎨 Theme & Design

- **Primary Color**: TigerTrust Green (#13724d)
- **Background**: White (#FFFFFF)
- **Typography**: Clean sans-serif font stack
- **Layout**: Responsive design with mobile-first approach

## 🚀 Development Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository and navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. **Add required static assets** to `public/images/`:
   - `crypto-wallet-illustration.svg`
   - `success-checkmark.svg`

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## 📱 Application Flow

### Landing Page (`/`)
- Hero section with TigerTrust branding
- "Get Started" button leads to identity verification
- "Learn More" button (placeholder functionality)

### Identity Verification (`/module1/onboard`)
- **Step 1**: Welcome and setup initiation
- **Step 2**: Profile creation simulation
- **Step 3**: Decentralized ID (DID) generation
- **Step 4**: Human liveness verification (simulated)

### Verification Success (`/module1/verified`)
- Confirmation of successful identity verification
- Display of simulated user details
- "Go to Dashboard" button (placeholder for future development)

## 🔧 Technical Implementation

### Frontend-Only Architecture
- **No Backend**: All interactions are simulated client-side
- **No Blockchain**: No actual blockchain connections or transactions
- **Local State**: All "verification" steps use React state management
- **Simulated Delays**: 1.5-second delays simulate real processing
- **Error Simulation**: 10% chance of random step failures for realistic UX

### Key Technologies
- **Next.js**: React framework with pages router
- **Tailwind CSS**: Utility-first CSS framework
- **React Hooks**: useState, useEffect, useRouter for state management

## 📁 Project Structure

```
├── components/
│   ├── Navbar.js              # Navigation component
│   └── HeroSection.js          # Landing page hero
├── pages/
│   ├── _app.js                 # Next.js app wrapper
│   ├── index.js                # Landing page
│   └── module1/
│       ├── onboard.js          # Identity verification flow
│       └── verified.js         # Verification success page
├── styles/
│   └── globals.css             # Global styles with Tailwind
├── public/
│   └── images/                 # Static assets (add SVG files here)
└── tailwind.config.js          # Tailwind configuration
```

## ⚠️ Important Notes

### Frontend-Only Application
This is a **purely UI/UX driven frontend**. There are no actual:
- Blockchain interactions
- API calls
- Backend logic
- Real identity verification
- Actual wallet connections

All "verification" steps, user data, and progress are simulated client-side using React state.

### Placeholder Features
Several features are designed as placeholders for future development:
- Login/Signup links in navbar
- Learn More button functionality
- Dashboard page (referenced but not implemented)
- Actual wallet integration

### Development vs Production
This application is designed for demonstration and development purposes. For production use, you would need to:
- Implement actual blockchain connectivity
- Add real identity verification services
- Include backend API integration
- Add proper error handling and security measures

## 🎯 Next Steps for Production

1. **Backend Integration**: Connect to actual APIs for identity verification
2. **Blockchain Integration**: Implement Solana wallet connections and smart contracts
3. **Security**: Add proper authentication and authorization
4. **Database**: Store user profiles and verification status
5. **Testing**: Add comprehensive test coverage
6. **Deployment**: Configure for production deployment

## 📞 Support

This is a demo application built for showcasing TigerTrust's frontend capabilities. For questions or contributions, please refer to the project documentation.

---

**Remember**: This is a frontend-only demonstration. Add the required SVG assets before running the application!