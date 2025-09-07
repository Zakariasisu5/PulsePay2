// Generic contract service that loads ABIs from the contracts folder.
// Does not modify any UI files. Consumers can import functions
// from here to read/write on-chain.
import { ethers } from "ethers";
import { getProvider, getSigner } from "./ethProvider";

// Helper to dynamically import compiled artifact (ABI + bytecode) JSON.
// Expects artifacts to be placed under `/contracts/` or `/public/contracts/` as JSON.
// You can adapt the path depending on where you put build output.
async function loadArtifactJson(artifactRelativePath) {
  // Prefer runtime fetch to avoid bundling issues and keep UI untouched.
  const response = await fetch(artifactRelativePath);
  if (!response.ok) {
    throw new Error(`Failed to load contract artifact: ${artifactRelativePath}`);
  }
  return await response.json();
}

export async function getReadOnlyContract(contractAddress, artifactPath) {
  const provider = await getProvider();
  const artifact = await loadArtifactJson(artifactPath);
  const abi = artifact.abi ?? artifact.ABI ?? artifact.interface ?? artifact;
  if (!abi) throw new Error("Artifact JSON missing ABI");
  return new ethers.Contract(contractAddress, abi, provider);
}

export async function getWriteContract(contractAddress, artifactPath) {
  const signer = await getSigner();
  const artifact = await loadArtifactJson(artifactPath);
  const abi = artifact.abi ?? artifact.ABI ?? artifact.interface ?? artifact;
  if (!abi) throw new Error("Artifact JSON missing ABI");
  return new ethers.Contract(contractAddress, abi, signer);
}

// Optional helper to deploy a contract at runtime (for dev/test).
export async function deployContract(artifactPath, constructorArgs = []) {
  const signer = await getSigner();
  const artifact = await loadArtifactJson(artifactPath);
  const abi = artifact.abi ?? artifact.ABI;
  const bytecode = artifact.bytecode ?? artifact.data?.bytecode?.object;
  if (!abi || !bytecode) throw new Error("Artifact JSON missing abi/bytecode");
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy(...constructorArgs);
  await contract.waitForDeployment?.();
  return contract;
}


