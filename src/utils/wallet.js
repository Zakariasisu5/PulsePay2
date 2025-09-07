import { ethers } from "ethers";

// Only read from window.ethereum - do not define or modify it
function getEthereumProvider() {
  const { ethereum } = window;
  if (ethereum) {
    console.log("MetaMask is available");
    return ethereum;
  } else {
    console.log("MetaMask not found");
    return null;
  }
}

export async function connectWallet(setWalletAddress) {
  try {
    const ethereum = getEthereumProvider();
    if (ethereum) {
      // Request account access
      await ethereum.request({ method: 'eth_requestAccounts' });
      
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setWalletAddress(address);
      localStorage.setItem("pulsepay_wallet", address);
      console.log('✅ Connected to MetaMask:', address);
      return address;
    } else {
      throw new Error("MetaMask not found");
    }
  } catch (err) {
    console.error("MetaMask connection failed:", err);
    return null;
  }
}

export async function disconnectWallet(setWalletAddress) {
  try {
    // Clear local storage
    localStorage.removeItem("pulsepay_wallet");
    
    // Reset wallet address
    setWalletAddress("");
    
    console.log("Wallet disconnected successfully");
    return true;
  } catch (err) {
    console.error("Wallet disconnection failed", err);
    return false;
  }
}