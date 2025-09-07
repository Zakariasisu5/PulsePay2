// SonicPay SDK - Easy integration for other dApps
// Provides simple functions for subscription management

import { ethers } from "ethers";
import { getProvider, getSigner } from "./ethProvider";
import { CONTRACTS, ARTIFACTS } from "./addresses";
import { feeMService, isFeeMAvailable, executeGaslessPayment } from "./feemService";

class SonicPaySDK {
  constructor(config = {}) {
    this.config = {
      contractAddress: config.contractAddress || CONTRACTS.SUBSCRIPTION,
      artifactPath: config.artifactPath || ARTIFACTS.SUBSCRIPTION,
      defaultToken: config.defaultToken || CONTRACTS.MOCK_ERC20,
      ...config
    };
    
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.initialized = false;
  }

  // Initialize the SDK
  async initialize() {
    try {
      this.provider = await getProvider();
      this.signer = await getSigner();
      
      // Load contract
      const artifact = await import(this.config.artifactPath);
      this.contract = new ethers.Contract(
        this.config.contractAddress,
        artifact.abi,
        this.signer
      );
      
      this.initialized = true;
      console.log("✅ SonicPay SDK initialized");
      return true;
    } catch (error) {
      console.error("❌ SonicPay SDK initialization failed:", error);
      return false;
    }
  }

  // Check if SDK is ready
  isReady() {
    return this.initialized && this.contract && this.signer;
  }

  // Get user's current subscription
  async getUserSubscription(userAddress = null) {
    if (!this.isReady()) throw new Error("SDK not initialized");
    
    const address = userAddress || await this.signer.getAddress();
    
    try {
      const subscription = await this.contract.getUserSubscription(address);
      
      if (!subscription.active) {
        return { active: false };
      }
      
      const plan = await this.contract.getPlan(subscription.planId);
      
      return {
        active: subscription.active,
        planId: subscription.planId.toString(),
        plan: {
          name: plan.name,
          amount: ethers.formatEther(plan.amount),
          interval: plan.interval.toString(),
          merchant: plan.merchant,
          supportsNFT: plan.supportsNFT
        },
        nextPaymentTime: subscription.nextPaymentTime,
        lastPaymentTime: subscription.lastPaymentTime,
        totalPaid: ethers.formatEther(subscription.totalPaid),
        nftTokenId: subscription.nftTokenId.toString()
      };
    } catch (error) {
      console.error("❌ Failed to get user subscription:", error);
      return { active: false, error: error.message };
    }
  }

  // Subscribe to a plan
  async subscribeToPlan(planId, tokenAddress = null) {
    if (!this.isReady()) throw new Error("SDK not initialized");
    
    const token = tokenAddress || this.config.defaultToken;
    
    try {
      const tx = await this.contract.subscribe(planId, token);
      const receipt = await tx.wait();
      
      console.log("✅ Successfully subscribed to plan:", planId);
      return {
        success: true,
        transactionHash: receipt.hash,
        planId: planId
      };
    } catch (error) {
      console.error("❌ Failed to subscribe to plan:", error);
      throw error;
    }
  }

  // Create a new subscription plan
  async createPlan(planData) {
    if (!this.isReady()) throw new Error("SDK not initialized");
    
    const {
      name,
      amount, // in ETH
      interval, // in seconds
      supportsNFT = false,
      maxSubscribers = 1000
    } = planData;
    
    try {
      const tx = await this.contract.createPlan(
        name,
        ethers.parseEther(amount.toString()),
        interval,
        supportsNFT,
        maxSubscribers
      );
      
      const receipt = await tx.wait();
      
      // Extract plan ID from events
      const events = receipt.logs.filter(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === 'PlanCreated';
        } catch {
          return false;
        }
      });
      
      const planId = events.length > 0 ? events[0].args.planId.toString() : null;
      
      console.log("✅ Successfully created plan:", name);
      return {
        success: true,
        transactionHash: receipt.hash,
        planId: planId
      };
    } catch (error) {
      console.error("❌ Failed to create plan:", error);
      throw error;
    }
  }

  // Get plan details
  async getPlan(planId) {
    if (!this.isReady()) throw new Error("SDK not initialized");
    
    try {
      const plan = await this.contract.getPlan(planId);
      
      return {
        planId: plan.planId.toString(),
        name: plan.name,
        amount: ethers.formatEther(plan.amount),
        interval: plan.interval.toString(),
        merchant: plan.merchant,
        active: plan.active,
        supportsNFT: plan.supportsNFT,
        maxSubscribers: plan.maxSubscribers.toString(),
        currentSubscribers: plan.currentSubscribers.toString()
      };
    } catch (error) {
      console.error("❌ Failed to get plan:", error);
      throw error;
    }
  }

  // Get all available plans
  async getAllPlans() {
    if (!this.isReady()) throw new Error("SDK not initialized");
    
    try {
      const plans = [];
      
      // Get all PlanCreated events
      const filter = this.contract.filters.PlanCreated();
      const events = await this.contract.queryFilter(filter);
      
      for (const event of events) {
        const planId = event.args.planId.toString();
        const plan = await this.getPlan(planId);
        plans.push(plan);
      }
      
      return plans.filter(plan => plan.active);
    } catch (error) {
      console.error("❌ Failed to get all plans:", error);
      return [];
    }
  }

  // Process payment (for gasless transactions)
  async processPayment(userAddress, planId, tokenAddress = null) {
    if (!this.isReady()) throw new Error("SDK not initialized");
    
    const token = tokenAddress || this.config.defaultToken;
    
    try {
      if (isFeeMAvailable()) {
        // Use gasless payment
        const tx = await executeGaslessPayment(userAddress, planId, token);
        return {
          success: true,
          transactionHash: tx.hash,
          gasless: true
        };
      } else {
        // Use regular transaction
        const tx = await this.contract.processPayment(userAddress, token);
        const receipt = await tx.wait();
        
        return {
          success: true,
          transactionHash: receipt.hash,
          gasless: false
        };
      }
    } catch (error) {
      console.error("❌ Failed to process payment:", error);
      throw error;
    }
  }

  // Check if user can make gasless payments
  async checkGaslessPaymentCapability(userAddress, planId, tokenAddress = null) {
    if (!this.isReady()) throw new Error("SDK not initialized");
    
    const token = tokenAddress || this.config.defaultToken;
    
    try {
      const allowance = await feeMService.checkGaslessPaymentAllowance(userAddress, planId, token);
      const feeMStatus = await feeMService.getFeeMStatus();
      
      return {
        canPayGasless: isFeeMAvailable() && allowance.canPay,
        feeMAvailable: feeMStatus.available,
        hasAllowance: allowance.hasAllowance,
        hasBalance: allowance.balance >= allowance.required,
        allowance: allowance.allowance,
        balance: allowance.balance,
        required: allowance.required
      };
    } catch (error) {
      console.error("❌ Failed to check gasless payment capability:", error);
      return {
        canPayGasless: false,
        feeMAvailable: false,
        hasAllowance: false,
        hasBalance: false,
        allowance: "0",
        balance: "0",
        required: "0"
      };
    }
  }

  // Get payment history for a user
  async getPaymentHistory(userAddress = null) {
    if (!this.isReady()) throw new Error("SDK not initialized");
    
    const address = userAddress || await this.signer.getAddress();
    
    try {
      const history = [];
      
      // Get Charged events for this user
      const filter = this.contract.filters.Charged(address);
      const events = await this.contract.queryFilter(filter);
      
      for (const event of events) {
        history.push({
          user: event.args.user,
          planId: event.args.planId.toString(),
          amount: ethers.formatEther(event.args.amount),
          timestamp: new Date(event.args.timestamp * 1000).toISOString(),
          transactionHash: event.transactionHash
        });
      }
      
      return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error("❌ Failed to get payment history:", error);
      return [];
    }
  }

  // Get merchant statistics
  async getMerchantStats(merchantAddress) {
    if (!this.isReady()) throw new Error("SDK not initialized");
    
    try {
      const stats = await this.contract.getMerchantStats(merchantAddress);
      
      return {
        revenue: ethers.formatEther(stats.revenue),
        activePlans: stats.activePlans.toString(),
        totalSubscribers: stats.totalSubscribers.toString()
      };
    } catch (error) {
      console.error("❌ Failed to get merchant stats:", error);
      throw error;
    }
  }

  // Get global platform statistics
  async getGlobalStats() {
    if (!this.isReady()) throw new Error("SDK not initialized");
    
    try {
      const stats = await this.contract.getGlobalStats();
      
      return {
        totalRevenue: ethers.formatEther(stats.totalRev),
        totalSubscriptions: stats.totalSubs.toString(),
        totalPlans: stats.totalPlans.toString()
      };
    } catch (error) {
      console.error("❌ Failed to get global stats:", error);
      throw error;
    }
  }

  // Cancel subscription (if user is the subscriber)
  async cancelSubscription() {
    if (!this.isReady()) throw new Error("SDK not initialized");
    
    try {
      const userAddress = await this.signer.getAddress();
      const subscription = await this.getUserSubscription(userAddress);
      
      if (!subscription.active) {
        throw new Error("No active subscription to cancel");
      }
      
      // Note: The contract doesn't have a cancel function for users
      // This would need to be implemented in the contract
      throw new Error("Subscription cancellation not implemented in contract");
    } catch (error) {
      console.error("❌ Failed to cancel subscription:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const sonicPaySDK = new SonicPaySDK();

// Export utility functions for easy integration
export async function initializeSonicPaySDK(config = {}) {
  const sdk = new SonicPaySDK(config);
  await sdk.initialize();
  return sdk;
}

export async function getUserSubscription(userAddress = null) {
  return await sonicPaySDK.getUserSubscription(userAddress);
}

export async function subscribeToPlan(planId, tokenAddress = null) {
  return await sonicPaySDK.subscribeToPlan(planId, tokenAddress);
}

export async function createPlan(planData) {
  return await sonicPaySDK.createPlan(planData);
}

export async function getPlan(planId) {
  return await sonicPaySDK.getPlan(planId);
}

export async function getAllPlans() {
  return await sonicPaySDK.getAllPlans();
}

export async function processPayment(userAddress, planId, tokenAddress = null) {
  return await sonicPaySDK.processPayment(userAddress, planId, tokenAddress);
}

export async function checkGaslessPaymentCapability(userAddress, planId, tokenAddress = null) {
  return await sonicPaySDK.checkGaslessPaymentCapability(userAddress, planId, tokenAddress);
}

export async function getPaymentHistory(userAddress = null) {
  return await sonicPaySDK.getPaymentHistory(userAddress);
}

export async function getMerchantStats(merchantAddress) {
  return await sonicPaySDK.getMerchantStats(merchantAddress);
}

export async function getGlobalStats() {
  return await sonicPaySDK.getGlobalStats();
}

// Export the SDK class for custom instances
export { SonicPaySDK };
