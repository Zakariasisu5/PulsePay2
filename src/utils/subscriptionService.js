// Thin wrapper for the Subscription.sol contract interactions.
// No component changes; consumers can call these functions.
import { CONTRACTS, ARTIFACTS } from "./addresses";
import { getReadOnlyContract, getWriteContract } from "./contractService";

export async function getSubscriptionReadOnly() {
  if (!CONTRACTS.SUBSCRIPTION) throw new Error("Missing VITE_SUBSCRIPTION_ADDRESS");
  return await getReadOnlyContract(CONTRACTS.SUBSCRIPTION, ARTIFACTS.SUBSCRIPTION);
}

export async function getSubscriptionWrite() {
  if (!CONTRACTS.SUBSCRIPTION) throw new Error("Missing VITE_SUBSCRIPTION_ADDRESS");
  return await getWriteContract(CONTRACTS.SUBSCRIPTION, ARTIFACTS.SUBSCRIPTION);
}

// Example common read methods (adjust to your ABI):
export async function getPlan(priceId) {
  const contract = await getSubscriptionReadOnly();
  return await contract.getPlan?.(priceId);
}

export async function getUserSubscription(userAddress) {
  const contract = await getSubscriptionReadOnly();
  return await contract.getUserSubscription?.(userAddress);
}

// Example write method: subscribe or createPlan depending on your ABI
export async function createPlan(tokenAddress, pricePerPeriod, periodSeconds) {
  const contract = await getSubscriptionWrite();
  const tx = await contract.createPlan?.(tokenAddress, pricePerPeriod, periodSeconds);
  return await tx.wait?.();
}

export async function subscribe(planId) {
  const contract = await getSubscriptionWrite();
  const tx = await contract.subscribe?.(planId);
  return await tx.wait?.();
}


