// Lightweight provider/signer helpers. No UI changes here.
import { ethers } from "ethers";

export function getBrowserEthereum() {
  if (typeof window !== "undefined" && window.ethereum) {
    return window.ethereum;
  }
  throw new Error("No browser wallet (window.ethereum) found");
}

export async function getProvider() {
  const ethereum = getBrowserEthereum();
  return new ethers.BrowserProvider(ethereum);
}

export async function getSigner() {
  const provider = await getProvider();
  // In v6, getSigner() is async; in v5 it is sync. Await covers both.
  const signer = await provider.getSigner();
  return signer;
}

export async function getConnectedAddress() {
  const signer = await getSigner();
  // v6 uses signer.getAddress(), same method name in v5
  return await signer.getAddress();
}


