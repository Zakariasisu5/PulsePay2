// Real-time Subscription Status Watcher
// Monitors blockchain events and updates subscription status in real-time

import { ethers } from "ethers";
import { getProvider } from "./ethProvider";
import { CONTRACTS, ARTIFACTS } from "./addresses";

class SubscriptionWatcher {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.listeners = new Map();
    this.isWatching = false;
    this.eventFilters = {
      subscribed: null,
      charged: null,
      cancelled: null,
      planCreated: null
    };
  }

  async initialize() {
    try {
      this.provider = await getProvider();
      
      // Load contract
      const artifact = await import(ARTIFACTS.SUBSCRIPTION);
      this.contract = new ethers.Contract(
        CONTRACTS.SUBSCRIPTION,
        artifact.abi,
        this.provider
      );
      
      console.log("✅ Subscription Watcher initialized");
      return true;
    } catch (error) {
      console.error("❌ Subscription Watcher initialization failed:", error);
      return false;
    }
  }

  // Start watching for subscription events
  startWatching() {
    if (this.isWatching) {
      console.log("⚠️ Subscription watcher already running");
      return;
    }

    if (!this.contract) {
      console.error("❌ Contract not initialized");
      return;
    }

    this.isWatching = true;
    console.log("👀 Starting subscription event watcher...");

    // Set up event filters
    this.setupEventFilters();
    
    // Start listening to events
    this.startEventListeners();
  }

  // Stop watching for events
  stopWatching() {
    if (!this.isWatching) return;

    this.isWatching = false;
    
    // Remove all event listeners
    Object.values(this.eventFilters).forEach(filter => {
      if (filter) {
        this.contract.off(filter);
      }
    });

    console.log("⏹️ Subscription watcher stopped");
  }

  // Set up event filters
  setupEventFilters() {
    this.eventFilters.subscribed = this.contract.filters.Subscribed();
    this.eventFilters.charged = this.contract.filters.Charged();
    this.eventFilters.cancelled = this.contract.filters.Cancelled();
    this.eventFilters.planCreated = this.contract.filters.PlanCreated();
  }

  // Start listening to events
  startEventListeners() {
    // Listen for new subscriptions
    this.contract.on(this.eventFilters.subscribed, (user, planId, nextPaymentTime, nftTokenId, event) => {
      this.handleSubscriptionEvent('subscribed', {
        user,
        planId: planId.toString(),
        nextPaymentTime: nextPaymentTime.toString(),
        nftTokenId: nftTokenId.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: Date.now()
      });
    });

    // Listen for payment charges
    this.contract.on(this.eventFilters.charged, (user, planId, amount, timestamp, event) => {
      this.handleSubscriptionEvent('charged', {
        user,
        planId: planId.toString(),
        amount: amount.toString(),
        timestamp: timestamp.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        eventTimestamp: Date.now()
      });
    });

    // Listen for subscription cancellations
    this.contract.on(this.eventFilters.cancelled, (user, planId, nftTokenId, event) => {
      this.handleSubscriptionEvent('cancelled', {
        user,
        planId: planId.toString(),
        nftTokenId: nftTokenId.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: Date.now()
      });
    });

    // Listen for new plan creation
    this.contract.on(this.eventFilters.planCreated, (planId, merchant, name, amount, interval, supportsNFT, event) => {
      this.handleSubscriptionEvent('planCreated', {
        planId: planId.toString(),
        merchant,
        name,
        amount: amount.toString(),
        interval: interval.toString(),
        supportsNFT,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: Date.now()
      });
    });
  }

  // Handle subscription events
  handleSubscriptionEvent(eventType, eventData) {
    console.log(`📡 ${eventType.toUpperCase()} event:`, eventData);

    // Notify all listeners for this event type
    const listeners = this.listeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(eventData);
      } catch (error) {
        console.error(`❌ Error in ${eventType} listener:`, error);
      }
    });

    // Also notify general listeners
    const generalListeners = this.listeners.get('*') || [];
    generalListeners.forEach(listener => {
      try {
        listener(eventType, eventData);
      } catch (error) {
        console.error("❌ Error in general listener:", error);
      }
    });
  }

  // Add event listener
  addEventListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);

    console.log(`👂 Added listener for ${eventType} events`);
  }

  // Remove event listener
  removeEventListener(eventType, callback) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        console.log(`🔇 Removed listener for ${eventType} events`);
      }
    }
  }

  // Get current subscription status for a user
  async getCurrentSubscriptionStatus(userAddress) {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      const subscription = await this.contract.getUserSubscription(userAddress);
      
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
      console.error("❌ Failed to get current subscription status:", error);
      return { active: false, error: error.message };
    }
  }

  // Get recent events for a user
  async getRecentEvents(userAddress, eventType = null, limit = 50) {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      const events = [];
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks

      // Get different event types
      const eventTypes = eventType ? [eventType] : ['Subscribed', 'Charged', 'Cancelled'];
      
      for (const type of eventTypes) {
        let filter;
        
        switch (type) {
          case 'Subscribed':
            filter = this.contract.filters.Subscribed(userAddress);
            break;
          case 'Charged':
            filter = this.contract.filters.Charged(userAddress);
            break;
          case 'Cancelled':
            filter = this.contract.filters.Cancelled(userAddress);
            break;
          default:
            continue;
        }

        const typeEvents = await this.contract.queryFilter(filter, fromBlock);
        
        for (const event of typeEvents) {
          const block = await this.provider.getBlock(event.blockNumber);
          
          events.push({
            type: type.toLowerCase(),
            user: event.args.user,
            planId: event.args.planId?.toString(),
            amount: event.args.amount ? ethers.formatEther(event.args.amount) : null,
            timestamp: event.args.timestamp ? new Date(event.args.timestamp * 1000).toISOString() : new Date(block.timestamp * 1000).toISOString(),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        }
      }

      // Sort by timestamp and limit
      return events
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error("❌ Failed to get recent events:", error);
      return [];
    }
  }

  // Watch for specific user's subscription changes
  watchUserSubscription(userAddress, callback) {
    const userCallback = (eventType, eventData) => {
      if (eventData.user.toLowerCase() === userAddress.toLowerCase()) {
        callback(eventType, eventData);
      }
    };

    this.addEventListener('*', userCallback);
    
    // Return cleanup function
    return () => {
      this.removeEventListener('*', userCallback);
    };
  }

  // Watch for merchant's plan events
  watchMerchantEvents(merchantAddress, callback) {
    const merchantCallback = (eventType, eventData) => {
      if (eventData.merchant && eventData.merchant.toLowerCase() === merchantAddress.toLowerCase()) {
        callback(eventType, eventData);
      }
    };

    this.addEventListener('*', merchantCallback);
    
    // Return cleanup function
    return () => {
      this.removeEventListener('*', merchantCallback);
    };
  }

  // Get watcher status
  getStatus() {
    return {
      isWatching: this.isWatching,
      listenersCount: Array.from(this.listeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
      eventTypes: Array.from(this.listeners.keys())
    };
  }
}

// Export singleton instance
export const subscriptionWatcher = new SubscriptionWatcher();

// Export utility functions
export async function initializeSubscriptionWatcher() {
  return await subscriptionWatcher.initialize();
}

export function startSubscriptionWatcher() {
  return subscriptionWatcher.startWatching();
}

export function stopSubscriptionWatcher() {
  return subscriptionWatcher.stopWatching();
}

export function addSubscriptionEventListener(eventType, callback) {
  return subscriptionWatcher.addEventListener(eventType, callback);
}

export function removeSubscriptionEventListener(eventType, callback) {
  return subscriptionWatcher.removeEventListener(eventType, callback);
}

export function watchUserSubscription(userAddress, callback) {
  return subscriptionWatcher.watchUserSubscription(userAddress, callback);
}

export function watchMerchantEvents(merchantAddress, callback) {
  return subscriptionWatcher.watchMerchantEvents(merchantAddress, callback);
}

export async function getCurrentSubscriptionStatus(userAddress) {
  return await subscriptionWatcher.getCurrentSubscriptionStatus(userAddress);
}

export async function getRecentSubscriptionEvents(userAddress, eventType = null, limit = 50) {
  return await subscriptionWatcher.getRecentEvents(userAddress, eventType, limit);
}

export function getSubscriptionWatcherStatus() {
  return subscriptionWatcher.getStatus();
}
