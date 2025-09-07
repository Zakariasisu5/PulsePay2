import { useState, useEffect } from 'react';
import { connectWallet, disconnectWallet } from '../utils/wallet';
import { CONTRACTS, ARTIFACTS } from '../utils/addresses';
import { getReadOnlyContract, getWriteContract } from '../utils/contractService';
import { ethers } from 'ethers';
import { formatEther, parseEther } from 'ethers';

export default function TransactionExecutor() {
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [contractInfo, setContractInfo] = useState(null);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [planId, setPlanId] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const [planName, setPlanName] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");

  // Load wallet address on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('pulsepay_wallet');
    if (savedWallet) setWalletAddress(savedWallet);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const address = await connectWallet(setWalletAddress);
      if (address) {
        console.log("✅ Wallet connected:", address);
        await loadContractInfo();
        await loadTokenBalance();
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
      setTokenBalance("0");
      setTransactionStatus("");
      console.log("✅ Wallet disconnected");
    } catch (error) {
      console.error("❌ Disconnect failed:", error);
    }
    setLoading(false);
  };

  const loadContractInfo = async () => {
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
      
      console.log("✅ Contract info loaded");
    } catch (error) {
      console.error("❌ Failed to load contract info:", error);
    }
  };

  const loadTokenBalance = async () => {
    if (!walletAddress) return;
    
    try {
      const tokenContract = await getReadOnlyContract(
        CONTRACTS.MOCK_ERC20,
        ARTIFACTS.MOCK_ERC20
      );
      
      const balance = await tokenContract.balanceOf(walletAddress);
      setTokenBalance(formatEther(balance));
      console.log("✅ Token balance loaded:", formatEther(balance));
    } catch (error) {
      console.error("❌ Failed to load token balance:", error);
    }
  };

  const createPlan = async () => {
    if (!walletAddress || !planName || !planAmount) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    setTransactionStatus("Creating plan...");
    
    try {
      const contract = await getWriteContract(
        CONTRACTS.SUBSCRIPTION,
        ARTIFACTS.SUBSCRIPTION
      );
      
      // Convert amount to wei (assuming 18 decimals)
      const amountInWei = parseEther(planAmount);
      
      // Create plan with 30 days interval (30 * 24 * 60 * 60 seconds)
      const interval = 30 * 24 * 60 * 60;
      const supportsNFT = false;
      const maxSubscribers = 100;
      
      const tx = await contract.createPlan(
        planName,
        amountInWei,
        interval,
        supportsNFT,
        maxSubscribers
      );
      
      setTransactionStatus("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      
      setTransactionStatus(`✅ Plan created! Transaction hash: ${receipt.hash.slice(0, 10)}...`);
      
      // Reset form
      setPlanName("");
      setPlanAmount("");
      
      // Reload contract info
      await loadContractInfo();
      
    } catch (error) {
      console.error("❌ Failed to create plan:", error);
      setTransactionStatus(`❌ Failed to create plan: ${error.message}`);
    }
    
    setLoading(false);
  };

  const subscribeToPlan = async () => {
    if (!walletAddress || !planId) {
      alert("Please enter a plan ID");
      return;
    }

    setLoading(true);
    setTransactionStatus("Subscribing to plan...");
    
    try {
      const contract = await getWriteContract(
        CONTRACTS.SUBSCRIPTION,
        ARTIFACTS.SUBSCRIPTION
      );
      
      // Subscribe using MockERC20 token
      const tx = await contract.subscribe(planId, CONTRACTS.MOCK_ERC20);
      
      setTransactionStatus("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      
      setTransactionStatus(`✅ Subscribed to plan ${planId}! Transaction hash: ${receipt.hash.slice(0, 10)}...`);
      
      // Reset form
      setPlanId("");
      
      // Reload contract info
      await loadContractInfo();
      await loadTokenBalance();
      
    } catch (error) {
      console.error("❌ Failed to subscribe:", error);
      setTransactionStatus(`❌ Failed to subscribe: ${error.message}`);
    }
    
    setLoading(false);
  };

  const mintTestTokens = async () => {
    if (!walletAddress) {
      alert("Please connect wallet first");
      return;
    }

    setLoading(true);
    setTransactionStatus("Minting test tokens...");
    
    try {
      const tokenContract = await getWriteContract(
        CONTRACTS.MOCK_ERC20,
        ARTIFACTS.MOCK_ERC20
      );
      
      // Mint 1000 tokens
      const amount = parseEther("1000");
      const tx = await tokenContract.mint(walletAddress, amount);
      
      setTransactionStatus("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      
      setTransactionStatus(`✅ Minted 1000 test tokens! Transaction hash: ${receipt.hash.slice(0, 10)}...`);
      
      // Reload token balance
      await loadTokenBalance();
      
    } catch (error) {
      console.error("❌ Failed to mint tokens:", error);
      setTransactionStatus(`❌ Failed to mint tokens: ${error.message}`);
    }
    
    setLoading(false);
  };

  const approveTokens = async () => {
    if (!walletAddress) {
      alert("Please connect wallet first");
      return;
    }

    setLoading(true);
    setTransactionStatus("Approving tokens...");
    
    try {
      const tokenContract = await getWriteContract(
        CONTRACTS.MOCK_ERC20,
        ARTIFACTS.MOCK_ERC20
      );
      
      // Approve subscription contract to spend tokens
      const amount = parseEther("10000"); // Approve 10,000 tokens
      const tx = await tokenContract.approve(CONTRACTS.SUBSCRIPTION, amount);
      
      setTransactionStatus("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      
      setTransactionStatus(`✅ Tokens approved! Transaction hash: ${receipt.hash.slice(0, 10)}...`);
      
    } catch (error) {
      console.error("❌ Failed to approve tokens:", error);
      setTransactionStatus(`❌ Failed to approve tokens: ${error.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="p-6 bg-[#232344] rounded-lg border border-[#4deaff] max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-[#4deaff] mb-6">Transaction Executor</h2>
      
      <div className="space-y-6">
        {/* Wallet Connection */}
        <div className="p-4 bg-[#18182f] rounded">
          <h3 className="text-lg font-semibold text-[#4deaff] mb-3">Wallet Status</h3>
          <div className="flex items-center gap-4 mb-3">
            <p className="text-gray-300">Address:</p>
            <p className="font-mono text-[#4deaff]">
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Not Connected"}
            </p>
          </div>
          <div className="flex gap-2">
            {!walletAddress ? (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="bg-[#4deaff] text-[#18182f] px-4 py-2 rounded font-bold disabled:opacity-50"
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
              >
                {loading ? "Disconnecting..." : "Disconnect"}
              </button>
            )}
          </div>
        </div>

        {/* Token Balance */}
        {walletAddress && (
          <div className="p-4 bg-[#18182f] rounded">
            <h3 className="text-lg font-semibold text-[#4deaff] mb-3">Token Balance</h3>
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-300">MockERC20 Balance:</p>
              <p className="font-mono text-green-400">{tokenBalance} MTK</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={mintTestTokens}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
              >
                {loading ? "Minting..." : "Mint 1000 Test Tokens"}
              </button>
              <button
                onClick={approveTokens}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
              >
                {loading ? "Approving..." : "Approve Tokens"}
              </button>
            </div>
          </div>
        )}

        {/* Create Plan */}
        {walletAddress && (
          <div className="p-4 bg-[#18182f] rounded">
            <h3 className="text-lg font-semibold text-[#4deaff] mb-3">Create Subscription Plan</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Plan Name:</label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g., Premium Plan"
                  className="w-full p-2 bg-[#232344] border border-[#4deaff] rounded text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Amount (MTK):</label>
                <input
                  type="number"
                  value={planAmount}
                  onChange={(e) => setPlanAmount(e.target.value)}
                  placeholder="e.g., 10"
                  className="w-full p-2 bg-[#232344] border border-[#4deaff] rounded text-white"
                />
              </div>
              <button
                onClick={createPlan}
                disabled={loading || !planName || !planAmount}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Plan"}
              </button>
            </div>
          </div>
        )}

        {/* Subscribe to Plan */}
        {walletAddress && (
          <div className="p-4 bg-[#18182f] rounded">
            <h3 className="text-lg font-semibold text-[#4deaff] mb-3">Subscribe to Plan</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Plan ID:</label>
                <input
                  type="number"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  placeholder="e.g., 0"
                  className="w-full p-2 bg-[#232344] border border-[#4deaff] rounded text-white"
                />
              </div>
              <button
                onClick={subscribeToPlan}
                disabled={loading || !planId}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
              >
                {loading ? "Subscribing..." : "Subscribe to Plan"}
              </button>
            </div>
          </div>
        )}

        {/* Contract Info */}
        {contractInfo && (
          <div className="p-4 bg-[#18182f] rounded">
            <h3 className="text-lg font-semibold text-[#4deaff] mb-3">Contract Information</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-300">
                Contract Address: <span className="font-mono text-[#4deaff]">
                  {contractInfo.contractAddress.slice(0, 6)}...{contractInfo.contractAddress.slice(-4)}
                </span>
              </p>
              <p className="text-gray-300">
                Total Revenue: <span className="text-green-400">{formatEther(contractInfo.totalRevenue)} MTK</span>
              </p>
              <p className="text-gray-300">
                Total Subscriptions: <span className="text-green-400">{contractInfo.totalSubscriptions}</span>
              </p>
            </div>
          </div>
        )}

        {/* Transaction Status */}
        {transactionStatus && (
          <div className="p-4 bg-[#18182f] rounded">
            <h3 className="text-lg font-semibold text-[#4deaff] mb-3">Transaction Status</h3>
            <p className={`font-mono text-sm ${transactionStatus.includes('✅') ? 'text-green-400' : transactionStatus.includes('❌') ? 'text-red-400' : 'text-yellow-400'}`}>
              {transactionStatus}
            </p>
          </div>
        )}

        {/* Environment Info */}
        <div className="p-4 bg-[#18182f] rounded text-xs">
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
