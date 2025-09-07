import { useState } from 'react';
import { connectWallet, disconnectWallet } from '../utils/wallet';
import { CONTRACTS, ARTIFACTS } from '../utils/addresses';
import { getReadOnlyContract } from '../utils/contractService';

export default function WalletTest() {
  const [walletAddress, setWalletAddress] = useState("");
  const [contractInfo, setContractInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const address = await connectWallet(setWalletAddress);
      if (address) {
        console.log("✅ Wallet connected:", address);
      }
    } catch (error) {
      console.error("❌ Connection failed:", error);
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await disconnectWallet(setWalletAddress);
      setContractInfo(null);
      console.log("✅ Wallet disconnected");
    } catch (error) {
      console.error("❌ Disconnect failed:", error);
    }
    setLoading(false);
  };

  const testContractConnection = async () => {
    if (!walletAddress) {
      alert("Please connect wallet first");
      return;
    }

    setLoading(true);
    try {
      const contract = await getReadOnlyContract(
        CONTRACTS.SUBSCRIPTION,
        ARTIFACTS.SUBSCRIPTION
      );
      
      const totalRevenue = await contract.totalRevenue();
      const totalSubscriptions = await contract.totalSubscriptions();
      
      setContractInfo({
        totalRevenue: totalRevenue.toString(),
        totalSubscriptions: totalSubscriptions.toString(),
        contractAddress: CONTRACTS.SUBSCRIPTION
      });
      
      console.log("✅ Contract connection successful");
    } catch (error) {
      console.error("❌ Contract connection failed:", error);
      alert("Contract connection failed. Check console for details.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-[#232344] rounded-lg border border-[#4deaff] max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold text-[#4deaff] mb-4">Wallet Connection Test</h2>
      
      <div className="space-y-4">
        {/* Wallet Status */}
        <div className="p-3 bg-[#18182f] rounded">
          <p className="text-sm text-gray-300">Wallet Status:</p>
          <p className="font-mono text-[#4deaff]">
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Not Connected"}
          </p>
        </div>

        {/* Connection Buttons */}
        <div className="flex gap-2">
          {!walletAddress ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex-1 bg-[#4deaff] text-[#18182f] px-4 py-2 rounded font-bold disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
            >
              {loading ? "Disconnecting..." : "Disconnect"}
            </button>
          )}
        </div>

        {/* Contract Test */}
        {walletAddress && (
          <div className="space-y-2">
            <button
              onClick={testContractConnection}
              disabled={loading}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
            >
              {loading ? "Testing..." : "Test Contract Connection"}
            </button>
            
            {contractInfo && (
              <div className="p-3 bg-[#18182f] rounded text-sm">
                <p className="text-gray-300">Contract Info:</p>
                <p className="font-mono text-[#4deaff]">
                  Address: {contractInfo.contractAddress.slice(0, 6)}...{contractInfo.contractAddress.slice(-4)}
                </p>
                <p className="text-green-400">Total Revenue: {contractInfo.totalRevenue}</p>
                <p className="text-green-400">Total Subscriptions: {contractInfo.totalSubscriptions}</p>
              </div>
            )}
          </div>
        )}

        {/* Environment Info */}
        <div className="p-3 bg-[#18182f] rounded text-xs">
          <p className="text-gray-300">Environment:</p>
          <p className="font-mono text-[#4deaff]">
            Chain ID: {import.meta.env.VITE_CHAIN_ID || "Not set"}
          </p>
          <p className="font-mono text-[#4deaff]">
            Network: {import.meta.env.VITE_NETWORK_NAME || "Not set"}
          </p>
        </div>
      </div>
    </div>
  );
}
