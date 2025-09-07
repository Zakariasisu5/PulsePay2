// Sonic FeeM (Fee Abstraction) Service
// Handles gasless transactions for subscription payments

import { ethers } from "ethers";
import { getProvider, getSigner } from "./ethProvider";
import { CONTRACTS } from "./addresses";

// Simple ABI for basic contract functions
const SUBSCRIPTION_ABI = [
  "function feeMEnabled() external view returns (bool)",
  "function feeMRelayer() external view returns (address)",
  "function processBatchPayments(address[] memory userAddresses, address tokenAddress, uint256[] memory amounts) external",
  "function getPlan(bytes32 planId) external view returns (string memory, uint256, uint256)",
  "function nonces(address user) external view returns (uint256)",
  "event Charged(address indexed user, address indexed token, uint256 amount, uint256 timestamp)"
];

class FeeMService {
  constructor() {
    this.relayerAddress = import.meta.env.VITE_FEEM_RELAYER_ADDRESS;
    this.feeMEnabled = import.meta.env.VITE_FEEM_ENABLED === 'true';
    this.provider = null;
    this.signer = null;
  }

  async initialize() {
    try {
      this.provider = await getProvider();
      this.signer = await getSigner();
      console.log("✅ FeeM Service initialized");
      return true;
    } catch (error) {
      console.error("❌ FeeM Service initialization failed:", error);
      return false;
    }
  }

  // Check if FeeM is available and enabled
  isFeeMAvailable() {
    return this.feeMEnabled && this.relayerAddress && this.relayerAddress !== "0x0000000000000000000000000000000000000000";
  }

  // Get FeeM relayer status from contract
  async getFeeMStatus() {
    try {
      const contract = new ethers.Contract(
        CONTRACTS.SUBSCRIPTION,
        SUBSCRIPTION_ABI,
        this.provider
      );
      
      const feeMEnabled = await contract.feeMEnabled();
      const feeMRelayer = await contract.feeMRelayer();
      
      return {
        enabled: feeMEnabled,
        relayer: feeMRelayer,
        available: this.isFeeMAvailable()
      };
    } catch (error) {
      console.error("❌ Failed to get FeeM status:", error);
      return {
        enabled: false,
        relayer: null,
        available: false
      };
    }
  }

  // Process gasless payment using FeeM
  async processGaslessPayment(userAddress, planId, tokenAddress, amount) {
    try {
      if (!this.isFeeMAvailable()) {
        throw new Error("FeeM is not available or not properly configured");
      }

      const contract = new ethers.Contract(
        CONTRACTS.SUBSCRIPTION,
        SUBSCRIPTION_ABI,
        this.signer
      );

      // Create a meta-transaction for gasless payment
      const nonce = await contract.nonces(userAddress);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // For now, we'll use a simple direct call
      // In a real implementation, you'd create a meta-transaction
      const tx = await contract.processBatchPayments(
        [userAddress],
        tokenAddress,
        [amount],
        {
          gasLimit: 500000,
          value: 0
        }
      );

      const receipt = await tx.wait();
      console.log("✅ Gasless payment processed:", receipt.transactionHash);
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error("❌ Gasless payment failed:", error);
      throw error;
    }
  }

  // Process multiple gasless payments in batch
  async processBatchGaslessPayments(payments) {
    try {
      if (!this.isFeeMAvailable()) {
        throw new Error("FeeM is not available or not properly configured");
      }

      const contract = new ethers.Contract(
        CONTRACTS.SUBSCRIPTION,
        SUBSCRIPTION_ABI,
        this.signer
      );

      const userAddresses = payments.map(p => p.userAddress);
      const tokenAddress = payments[0].tokenAddress; // Assuming all use same token
      const amounts = payments.map(p => p.amount);

      const tx = await contract.processBatchPayments(
        userAddresses,
        tokenAddress,
        amounts,
        {
          gasLimit: 1000000,
          value: 0
        }
      );

      const receipt = await tx.wait();
      console.log("✅ Batch gasless payments processed:", receipt.transactionHash);
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        processedCount: payments.length
      };
    } catch (error) {
      console.error("❌ Batch gasless payments failed:", error);
      throw error;
    }
  }

  // Get payment history for a user
  async getPaymentHistory(userAddress) {
    try {
      const contract = new ethers.Contract(
        CONTRACTS.SUBSCRIPTION,
        SUBSCRIPTION_ABI,
        this.provider
      );

      // Filter for Charged events (gasless payments)
      const filter = contract.filters.Charged(userAddress);
      const events = await contract.queryFilter(filter);

      return events.map(event => ({
        user: event.args.user,
        token: event.args.token,
        amount: event.args.amount.toString(),
        timestamp: new Date(Number(event.args.timestamp) * 1000),
        txHash: event.transactionHash
      }));
    } catch (error) {
      console.error("❌ Failed to get payment history:", error);
      return [];
    }
  }
}

export default new FeeMService();