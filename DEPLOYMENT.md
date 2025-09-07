# 🚀 SonicPay Deployment Guide

## Overview
This guide will help you deploy SonicPay to Sonic Network and get it production-ready for the hackathon.

## Prerequisites

### 1. Environment Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env
```

### 2. Required Environment Variables
Create a `.env` file with the following variables:

```env
# Network Configuration
VITE_CHAIN_ID=64165
VITE_NETWORK_NAME=sonicTestnet
VITE_SONIC_RPC_URL=https://rpc-testnet.soniclabs.com

# Contract Addresses (will be populated after deployment)
VITE_SUBSCRIPTION_ADDRESS=
VITE_MOCK_ERC20_ADDRESS=
VITE_SONIC_ETH_ADDRESS=0x0000000000000000000000000000000000000000

# Sonic FeeM Configuration
VITE_FEEM_RELAYER_ADDRESS=
VITE_FEEM_ENABLED=true

# For deployment (add your private key)
PRIVATE_KEY=your_private_key_here
RPC_URL=https://rpc-testnet.soniclabs.com
```

### 3. Get Sonic Testnet Tokens
1. Visit [Sonic Testnet Faucet](https://faucet.soniclabs.com)
2. Connect your wallet
3. Request testnet tokens

## Deployment Steps

### Step 1: Compile Contracts
```bash
npm run compile
```

### Step 2: Deploy to Sonic Testnet
```bash
npm run deploy:sonic:testnet
```

This will:
- Deploy MockERC20 token
- Deploy SonicSubscrypt contract
- Configure supported tokens
- Create a sample plan
- Save addresses to `deployed-addresses.json`

### Step 3: Update Environment Variables
After deployment, update your `.env` file with the contract addresses from `deployed-addresses.json`:

```env
VITE_SUBSCRIPTION_ADDRESS=0x...
VITE_MOCK_ERC20_ADDRESS=0x...
```

### Step 4: Start the Frontend
```bash
npm run dev
```

## Production Deployment (Sonic Mainnet)

### Step 1: Update Environment for Mainnet
```env
VITE_CHAIN_ID=146
VITE_NETWORK_NAME=sonicMainnet
VITE_SONIC_RPC_URL=https://rpc.soniclabs.com
RPC_URL=https://rpc.soniclabs.com
```

### Step 2: Deploy to Mainnet
```bash
npm run deploy:sonic:mainnet
```

### Step 3: Verify Contracts
```bash
npm run verify:sonic:mainnet
```

## Features Implemented

### ✅ Core Features
- **Sonic Network Integration**: Full support for Sonic testnet and mainnet
- **FeeM Integration**: Gasless transactions for subscription payments
- **Smart Contracts**: Advanced subscription management with NFT passes
- **Automated Payments**: Background processing of recurring payments
- **Real-time Updates**: Live subscription status monitoring

### ✅ Frontend Features
- **User Dashboard**: Manage subscriptions and view payment history
- **Merchant Dashboard**: Create plans, track revenue, manage subscribers
- **Plans Marketplace**: Browse and subscribe to available plans
- **Wallet Integration**: MetaMask and Web3Modal support
- **Responsive Design**: Mobile-friendly interface

### ✅ Developer Features
- **Payment SDK**: Easy integration for other dApps
- **Real-time Events**: WebSocket-like event monitoring
- **Comprehensive APIs**: Full subscription management
- **Error Handling**: Robust error management and logging

## Testing the Platform

### 1. Create a Plan (Merchant)
1. Go to `/merchant`
2. Connect your wallet
3. Create a new subscription plan
4. Set amount, interval, and other parameters

### 2. Subscribe to a Plan (User)
1. Go to `/plans`
2. Browse available plans
3. Connect wallet and subscribe
4. View subscription in dashboard

### 3. Test Automated Payments
1. Use the Transaction Executor component
2. Mint test tokens
3. Approve tokens for subscription contract
4. Test payment processing

## Key Features for Hackathon

### 🎯 Why This Can Win

1. **Sonic-Specific**: Built specifically for Sonic Network with FeeM integration
2. **Real Problem**: Solves Web3 subscription payments (missing infrastructure)
3. **Production Ready**: Full-featured platform with merchant tools
4. **Developer Friendly**: SDK for easy integration by other dApps
5. **Scalable**: Handles high-frequency micro-billing (1-minute intervals)

### 🚀 Unique Value Propositions

- **Gasless UX**: Users don't pay gas fees for subscription payments
- **NFT Passes**: Subscription plans can include NFT membership passes
- **High Frequency**: Support for minute-level billing intervals
- **Multi-token**: Support for multiple payment tokens
- **Real-time**: Live updates and event monitoring
- **Merchant Tools**: Complete dashboard for revenue management

## Architecture

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

## Troubleshooting

### Common Issues

1. **Contract not deployed**: Check RPC URL and private key
2. **FeeM not working**: Verify FeeM relayer address
3. **Frontend not loading**: Check contract addresses in .env
4. **Transactions failing**: Ensure sufficient token balance

### Support

For issues or questions:
1. Check the console for error messages
2. Verify environment variables
3. Ensure wallet is connected to correct network
4. Check contract deployment status

## Next Steps

1. **Deploy to Sonic Testnet** and test all features
2. **Create sample plans** for demonstration
3. **Test with multiple users** to verify scalability
4. **Prepare demo** showcasing key features
5. **Document integration** for other developers

## Demo Script

1. **Show Problem**: Web3 lacks subscription infrastructure
2. **Demo Solution**: Create plan, subscribe, automated payments
3. **Highlight Sonic**: FeeM gasless transactions, high throughput
4. **Show SDK**: Easy integration for other dApps
5. **Merchant Tools**: Revenue tracking and management

---

**Ready to win the hackathon! 🏆**
