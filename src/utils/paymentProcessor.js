// Automated Payment Processing System
// Handles recurring subscription payments

import { ethers } from "ethers";
import { getProvider, getSigner } from "./ethProvider";
import { CONTRACTS } from "./addresses";

// Simple ABI for subscription contract
const SUBSCRIPTION_ABI = [
  "function getSubscription(address user, bytes32 planId) external view returns (bool active, uint256 nextPaymentTime, uint256 amount)",
  "function processPayment(address user, bytes32 planId) external",
  "function getPlan(bytes32 planId) external view returns (string memory, uint256, uint256)",
  "event PaymentProcessed(address indexed user, bytes32 indexed planId, uint256 amount, uint256 timestamp)"
];

class PaymentProcessor {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.isProcessing = false;
    this.processingInterval = null;
    this.subscribers = new Map();
    this.paymentHistory = [];
  }

  async initialize() {
    try {
      this.provider = await getProvider();
      this.signer = await getSigner();
      console.log("✅ Payment Processor initialized");
      return true;
    } catch (error) {
      console.error("❌ Payment Processor initialization failed:", error);
      return false;
    }
  }

  // Start automated payment processing
  startProcessing(intervalMinutes = 5) {
    if (this.isProcessing) {
      console.log("⚠️ Payment processing already running");
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Starting payment processing every ${intervalMinutes} minutes`);

    this.processingInterval = setInterval(async () => {
      await this.processDuePayments();
    }, intervalMinutes * 60 * 1000);

    // Process immediately
    this.processDuePayments();
  }

  // Stop automated payment processing
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    console.log("⏹️ Payment processing stopped");
  }

  // Get all subscriptions that need payment
  async getDuePayments() {
    try {
      const contract = new ethers.Contract(
        CONTRACTS.SUBSCRIPTION,
        SUBSCRIPTION_ABI,
        this.provider
      );

      const currentTime = Math.floor(Date.now() / 1000);
      const duePayments = [];

      // Get all active subscriptions from our local tracking
      for (const [userId, subscription] of this.subscribers) {
        if (subscription.nextPaymentTime <= currentTime) {
          duePayments.push({
            userAddress: userId,
            planId: subscription.planId,
            amount: subscription.amount
          });
        }
      }

      return duePayments;
    } catch (error) {
      console.error("❌ Failed to get due payments:", error);
      return [];
    }
  }

  // Process all due payments
  async processDuePayments() {
    try {
      console.log("🔄 Processing due payments...");
      
      const payments = await this.getDuePayments();
      if (payments.length === 0) {
        console.log("✅ No payments due at this time");
        return;
      }

      console.log(`💳 Found ${payments.length} payments to process`);

      const results = await this.processPayments(payments);
      
      console.log(`✅ Processed ${results.successful} payments successfully`);
      if (results.failed > 0) {
        console.log(`❌ ${results.failed} payments failed`);
      }

      return results;
    } catch (error) {
      console.error("❌ Payment processing failed:", error);
      return { successful: 0, failed: 1, errors: [error.message] };
    }
  }

  // Process a batch of payments
  async processPayments(payments) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const payment of payments) {
      try {
        console.log(`💳 Processing payment for ${payment.userAddress} (Plan: ${payment.planId})`);
        
        await this.processSinglePayment(payment);
        results.successful++;
        
        // Update next payment time
        this.updateNextPaymentTime(payment.userAddress, payment.planId);
        
      } catch (error) {
        console.error(`❌ Payment failed for ${payment.userAddress}:`, error);
        results.failed++;
        results.errors.push(`${payment.userAddress}: ${error.message}`);
      }
    }

    return results;
  }

  // Process a single payment
  async processSinglePayment(payment) {
    try {
      const contract = new ethers.Contract(
        CONTRACTS.SUBSCRIPTION,
        SUBSCRIPTION_ABI,
        this.signer
      );

      const tx = await contract.processPayment(
        payment.userAddress,
        payment.planId,
        {
          gasLimit: 300000
        }
      );

      const receipt = await tx.wait();
      
      // Record payment in history
      this.paymentHistory.push({
        userAddress: payment.userAddress,
        planId: payment.planId,
        amount: payment.amount,
        txHash: receipt.transactionHash,
        timestamp: new Date(),
        status: 'success'
      });

      console.log(`✅ Payment processed: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      // Record failed payment
      this.paymentHistory.push({
        userAddress: payment.userAddress,
        planId: payment.planId,
        amount: payment.amount,
        txHash: null,
        timestamp: new Date(),
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  // Add a subscription to track
  addSubscription(userAddress, planId, amount, intervalDays = 30) {
    const nextPaymentTime = Math.floor(Date.now() / 1000) + (intervalDays * 24 * 60 * 60);
    
    this.subscribers.set(userAddress, {
      planId,
      amount,
      nextPaymentTime,
      intervalDays,
      active: true
    });

    console.log(`📝 Added subscription for ${userAddress}, next payment: ${new Date(nextPaymentTime * 1000)}`);
  }

  // Remove a subscription
  removeSubscription(userAddress) {
    this.subscribers.delete(userAddress);
    console.log(`🗑️ Removed subscription for ${userAddress}`);
  }

  // Update next payment time
  updateNextPaymentTime(userAddress, planId) {
    const subscription = this.subscribers.get(userAddress);
    if (subscription) {
      const nextPaymentTime = Math.floor(Date.now() / 1000) + (subscription.intervalDays * 24 * 60 * 60);
      subscription.nextPaymentTime = nextPaymentTime;
      console.log(`⏰ Updated next payment time for ${userAddress}: ${new Date(nextPaymentTime * 1000)}`);
    }
  }

  // Get payment history
  getPaymentHistory(userAddress = null) {
    if (userAddress) {
      return this.paymentHistory.filter(payment => payment.userAddress === userAddress);
    }
    return this.paymentHistory;
  }

  // Get subscription status
  getSubscriptionStatus(userAddress) {
    const subscription = this.subscribers.get(userAddress);
    if (!subscription) {
      return null;
    }

    return {
      active: subscription.active,
      planId: subscription.planId,
      nextPaymentTime: subscription.nextPaymentTime,
      amount: subscription.amount,
      intervalDays: subscription.intervalDays
    };
  }

  // Manual payment processing (for testing)
  async processManualPayment(userAddress, planId) {
    try {
      console.log(`🔧 Manual payment processing for ${userAddress}`);
      
      const payment = {
        userAddress,
        planId,
        amount: 0 // Will be fetched from contract
      };

      await this.processSinglePayment(payment);
      console.log("✅ Manual payment processed successfully");
      
      return {
        success: true,
        message: "Payment processed successfully"
      };
    } catch (error) {
      console.error(`❌ Manual payment processing failed:`, error);
      throw error;
    }
  }

  // Get processing statistics
  getProcessingStats() {
    const totalSubscriptions = this.subscribers.size;
    const totalPayments = this.paymentHistory.length;
    const successfulPayments = this.paymentHistory.filter(p => p.status === 'success').length;
    const failedPayments = this.paymentHistory.filter(p => p.status === 'failed').length;
    
    return {
      totalSubscriptions,
      totalPayments,
      successfulPayments,
      failedPayments,
      successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
      isProcessing: this.isProcessing
    };
  }
}

export default new PaymentProcessor();