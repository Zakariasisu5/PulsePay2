// Centralized on-chain addresses and artifact paths, driven by env vars.
// Keep UI components unchanged; import from this module where needed.

function getEnv(name, fallback = "") {
  const value = import.meta?.env?.[name];
  return value ?? fallback;
}

export const CHAIN_ID = Number(getEnv("VITE_CHAIN_ID", "1"));

export const CONTRACTS = {
  SUBSCRIPTION: getEnv("VITE_SUBSCRIPTION_ADDRESS"),
  MOCK_ERC20: getEnv("VITE_MOCK_ERC20_ADDRESS"),
};

// Default artifact paths served statically from public/
export const ARTIFACTS = {
  SUBSCRIPTION: "/contracts/Subscription.json",
  MOCK_ERC20: "/contracts/MockERC20.json",
};


