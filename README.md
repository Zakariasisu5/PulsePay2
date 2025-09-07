# 🚀 SonicPay - Web3 Subscription Platform

**The first decentralized subscription platform built on Sonic Network with gasless transactions and automated payments.**

## 🌟 Why SonicPay Can Win the Hackathon

- **🎯 Sonic-Specific**: Built specifically for Sonic Network with FeeM integration
- **💡 Real Problem**: Solves missing Web3 subscription infrastructure
- **⚡ Gasless UX**: Users don't pay gas fees for subscription payments
- **🔄 Automated**: Background processing of recurring payments
- **📱 Production Ready**: Complete platform with merchant tools
- **🛠️ Developer Friendly**: SDK for easy integration by other dApps

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Smart         │    │   Sonic         │
│   (React)       │◄──►│   Contracts     │◄──►│   Network       │
│                 │    │   (Solidity)    │    │   (FeeM)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Payment       │    │   Automated     │    │   Real-time     │
│   SDK           │    │   Processor     │    │   Watcher       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ✨ Key Features

### 🎯 Core Features
- **Sonic Network Integration**: Full support for Sonic testnet and mainnet
- **FeeM Integration**: Gasless transactions for subscription payments
- **Smart Contracts**: Advanced subscription management with NFT passes
- **Automated Payments**: Background processing of recurring payments
- **Real-time Updates**: Live subscription status monitoring

### 🎨 Frontend Features
- **User Dashboard**: Manage subscriptions and view payment history
- **Merchant Dashboard**: Create plans, track revenue, manage subscribers
- **Plans Marketplace**: Browse and subscribe to available plans
- **Wallet Integration**: MetaMask and Web3Modal support
- **Responsive Design**: Mobile-friendly interface

### 🛠️ Developer Features
- **Payment SDK**: Easy integration for other dApps
- **Real-time Events**: WebSocket-like event monitoring
- **Comprehensive APIs**: Full subscription management
- **Error Handling**: Robust error management and logging

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask or compatible wallet
- Sonic testnet tokens

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd PulsePay

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Compile contracts
npm run compile
```

### Deployment
```bash
# Deploy to Sonic testnet
npm run deploy:sonic:testnet

# Start development server
npm run dev
```

## 📖 Usage

### For Users
1. **Connect Wallet**: Use MetaMask or Web3Modal
2. **Browse Plans**: Visit `/plans` to see available subscriptions
3. **Subscribe**: Click subscribe and approve transactions
4. **Manage**: View subscription status in `/dashboard`

### For Merchants
1. **Access Dashboard**: Go to `/merchant`
2. **Create Plans**: Set up subscription plans with pricing
3. **Track Revenue**: Monitor payments and subscriber growth
4. **Manage**: Deactivate plans or view analytics

### For Developers
```javascript
import { sonicPaySDK } from './utils/sonicPaySDK';

// Initialize SDK
await sonicPaySDK.initialize();

// Get user subscription
const subscription = await sonicPaySDK.getUserSubscription();

// Subscribe to plan
await sonicPaySDK.subscribeToPlan(planId);

// Create plan
await sonicPaySDK.createPlan({
  name: "Premium Plan",
  amount: "0.01", // ETH
  interval: 86400, // 1 day
  supportsNFT: true
});
```

## 🔧 Configuration

### Environment Variables
```env
# Network Configuration
VITE_CHAIN_ID=64165
VITE_NETWORK_NAME=sonicTestnet
VITE_SONIC_RPC_URL=https://rpc-testnet.soniclabs.com

# Contract Addresses
VITE_SUBSCRIPTION_ADDRESS=0x...
VITE_MOCK_ERC20_ADDRESS=0x...

# FeeM Configuration
VITE_FEEM_RELAYER_ADDRESS=0x...
VITE_FEEM_ENABLED=true
```

## 🏆 Hackathon Demo

### Demo Script
1. **Show Problem**: Web3 lacks subscription infrastructure
2. **Demo Solution**: Create plan, subscribe, automated payments
3. **Highlight Sonic**: FeeM gasless transactions, high throughput
4. **Show SDK**: Easy integration for other dApps
5. **Merchant Tools**: Revenue tracking and management

### Key Differentiators
- **Gasless Payments**: Users don't pay gas fees
- **High Frequency**: Support for minute-level billing
- **NFT Passes**: Subscription plans include NFT membership
- **Real-time**: Live updates and event monitoring
- **Scalable**: Handles thousands of subscriptions

## 📁 Project Structure

```
src/
├── Components/           # React components
│   ├── Dashboard.jsx    # User dashboard
│   ├── MerchantDashboard.jsx # Merchant tools
│   └── TransactionExecutor.jsx # Testing tools
├── pages/               # Page components
├── utils/               # Utility functions
│   ├── feemService.js   # FeeM integration
│   ├── paymentProcessor.js # Automated payments
│   ├── sonicPaySDK.js   # Payment SDK
│   └── subscriptionWatcher.js # Real-time events
contracts/               # Smart contracts
├── Subscription.sol     # Main subscription contract
└── MockERC20.sol        # Test token
```

## 🛡️ Security

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Access Control**: Role-based permissions
- **Input Validation**: Comprehensive parameter checking
- **Event Logging**: Full audit trail

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🏆 Why This Wins

**SonicPay directly addresses the hackathon's goals:**
- ✅ **Infrastructure**: Provides missing Web3 subscription infrastructure
- ✅ **Real Use Case**: Solves actual problems for SaaS, content creators, DAOs
- ✅ **Sonic Integration**: Leverages FeeM for gasless transactions
- ✅ **Deployable**: Production-ready platform
- ✅ **Scalable**: Handles high-frequency micro-billing
- ✅ **Developer Friendly**: SDK for mass adoption

**Ready to revolutionize Web3 subscriptions! 🚀**
