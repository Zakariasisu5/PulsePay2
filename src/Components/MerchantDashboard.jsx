import { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { connectWallet, disconnectWallet } from '../utils/wallet';
import { getReadOnlyContract, getWriteContract } from '../utils/contractService';
import { CONTRACTS, ARTIFACTS } from '../utils/addresses';
import paymentProcessor from '../utils/paymentProcessor';
import feeMService from '../utils/feemService';
import { ethers } from 'ethers';
import '../index.css';

export default function MerchantDashboard() {
  const { user, logout } = useAuth();
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [merchantStats, setMerchantStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [feeMStatus, setFeeMStatus] = useState(null);
  const [processingStats, setProcessingStats] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Plan creation form
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    amount: '',
    interval: '86400', // 1 day default
    supportsNFT: false,
    maxSubscribers: '1000'
  });

  useEffect(() => {
    const savedWallet = localStorage.getItem('pulsepay_wallet');
    if (savedWallet) setWalletAddress(savedWallet);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      loadMerchantData();
      loadFeeMStatus();
      loadProcessingStats();
    }
  }, [walletAddress]);

  const handleConnectWallet = async () => {
    setLoading(true);
    try {
      const address = await connectWallet(setWalletAddress);
      if (address) {
        console.log("✅ Wallet connected:", address);
        await loadMerchantData();
      }
    } catch (error) {
      console.error("❌ Connection failed:", error);
    }
    setLoading(false);
  };

  const handleDisconnectWallet = async () => {
    setLoading(true);
    try {
      await disconnectWallet(setWalletAddress);
      setMerchantStats(null);
      setPlans([]);
      setSubscribers([]);
      console.log("✅ Wallet disconnected");
    } catch (error) {
      console.error("❌ Disconnect failed:", error);
    }
    setLoading(false);
  };

  const loadMerchantData = async () => {
    if (!walletAddress) return;

    try {
      const contract = await getReadOnlyContract(CONTRACTS.SUBSCRIPTION, ARTIFACTS.SUBSCRIPTION);
      
      // Get merchant stats
      const stats = await contract.getMerchantStats(walletAddress);
      setMerchantStats({
        revenue: ethers.formatEther(stats.revenue),
        activePlans: stats.activePlans.toString(),
        totalSubscribers: stats.totalSubscribers.toString()
      });

      // Get all plans created by this merchant
      await loadMerchantPlans(contract);
      
      // Get recent payment history
      await loadRecentPayments(contract);

    } catch (error) {
      console.error("❌ Failed to load merchant data:", error);
    }
  };

  const loadMerchantPlans = async (contract) => {
    try {
      const allPlans = [];
      
      // Get all PlanCreated events for this merchant
      const filter = contract.filters.PlanCreated(null, walletAddress);
      const events = await contract.queryFilter(filter);
      
      for (const event of events) {
        const planId = event.args.planId.toString();
        const plan = await contract.getPlan(planId);
        
        allPlans.push({
          planId,
          name: plan.name,
          amount: ethers.formatEther(plan.amount),
          interval: plan.interval.toString(),
          active: plan.active,
          supportsNFT: plan.supportsNFT,
          maxSubscribers: plan.maxSubscribers.toString(),
          currentSubscribers: plan.currentSubscribers.toString()
        });
      }
      
      setPlans(allPlans);
    } catch (error) {
      console.error("❌ Failed to load merchant plans:", error);
    }
  };

  const loadRecentPayments = async (contract) => {
    try {
      const payments = [];
      
      // Get recent Charged events for this merchant's plans
      const filter = contract.filters.Charged();
      const events = await contract.queryFilter(filter);
      
      // Filter for payments to this merchant's plans
      const merchantPlanIds = plans.map(p => p.planId);
      const recentEvents = events
        .filter(event => merchantPlanIds.includes(event.args.planId.toString()))
        .slice(0, 20); // Last 20 payments
      
      for (const event of recentEvents) {
        const plan = await contract.getPlan(event.args.planId);
        if (plan.merchant.toLowerCase() === walletAddress.toLowerCase()) {
          payments.push({
            user: event.args.user,
            planId: event.args.planId.toString(),
            amount: ethers.formatEther(event.args.amount),
            timestamp: new Date(event.args.timestamp * 1000).toISOString(),
            transactionHash: event.transactionHash
          });
        }
      }
      
      setRevenueData(payments);
    } catch (error) {
      console.error("❌ Failed to load recent payments:", error);
    }
  };

  const loadFeeMStatus = async () => {
    try {
      const status = await feeMService.getFeeMStatus();
      setFeeMStatus(status);
    } catch (error) {
      console.error("❌ Failed to load FeeM status:", error);
    }
  };

  const loadProcessingStats = async () => {
    try {
      const stats = paymentProcessor.getProcessingStats();
      const history = paymentProcessor.getPaymentHistory();
      setProcessingStats(stats);
      setPaymentHistory(history);
    } catch (error) {
      console.error("❌ Failed to load processing stats:", error);
    }
  };

  const createPlan = async () => {
    if (!walletAddress || !newPlan.name || !newPlan.amount) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const contract = await getWriteContract(CONTRACTS.SUBSCRIPTION, ARTIFACTS.SUBSCRIPTION);
      
      const tx = await contract.createPlan(
        newPlan.name,
        ethers.parseEther(newPlan.amount),
        parseInt(newPlan.interval),
        newPlan.supportsNFT,
        parseInt(newPlan.maxSubscribers)
      );
      
      await tx.wait();
      console.log("✅ Plan created successfully");
      
      // Reset form and reload data
      setNewPlan({
        name: '',
        amount: '',
        interval: '86400',
        supportsNFT: false,
        maxSubscribers: '1000'
      });
      setShowCreatePlan(false);
      await loadMerchantData();
      
    } catch (error) {
      console.error("❌ Failed to create plan:", error);
      alert("Failed to create plan: " + error.message);
    }
    setLoading(false);
  };

  const deactivatePlan = async (planId) => {
    if (!confirm("Are you sure you want to deactivate this plan?")) return;

    setLoading(true);
    try {
      const contract = await getWriteContract(CONTRACTS.SUBSCRIPTION, ARTIFACTS.SUBSCRIPTION);
      
      const tx = await contract.deactivatePlan(planId);
      await tx.wait();
      
      console.log("✅ Plan deactivated successfully");
      await loadMerchantData();
      
    } catch (error) {
      console.error("❌ Failed to deactivate plan:", error);
      alert("Failed to deactivate plan: " + error.message);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#18182f] to-[#232344] text-lg text-gray-300 relative overflow-hidden">
        <div className="animated-bg-blobs">
          <div className="blob blob1"></div>
          <div className="blob blob2"></div>
          <div className="blob blob3"></div>
        </div>
        <div className="dashboard-access-card">
          <svg width="56" height="56" fill="none" viewBox="0 0 56 56" className="mb-4">
            <circle cx="28" cy="28" r="26" fill="#4deaff22" />
            <path d="M28 16v12M28 40h.01M28 40a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="#4deaff" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <h2>Access Restricted</h2>
          <p>Please log in to access the merchant dashboard.</p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <a href="/signin" className="sign-in-btn">Sign In</a>
            <a href="/signup" className="create-account-btn">Create Account</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-pulse-dark text-white relative overflow-x-hidden">
      {/* Animated Background */}
      <div className="animated-bg-blobs">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
        <div className="blob blob3"></div>
      </div>

      <div className="max-w-7xl mx-auto p-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#4deaff] mb-2">
              🏪 Merchant Dashboard
            </h1>
            <p className="text-gray-300">Manage your subscription plans and track revenue</p>
          </div>
          
          {/* Wallet Connection */}
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            {walletAddress ? (
              <div className="flex items-center gap-2">
                <div className="bg-[#232344] px-3 py-2 rounded-full text-[#4deaff] font-semibold shadow-lg border border-[#4deaff]">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
                <button
                  onClick={handleDisconnectWallet}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full transition disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={loading}
                className="bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white font-bold py-2 px-6 shadow-lg hover:from-pulse-purple hover:to-pulse-cyan transition-all duration-300 rounded-lg"
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        {merchantStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-[#232344] to-[#2e2e4d] p-6 rounded-xl border border-[#4deaff33] shadow-lg">
              <h3 className="text-lg font-semibold text-[#4deaff] mb-2">💰 Total Revenue</h3>
              <p className="text-2xl font-bold text-green-400">{merchantStats.revenue} ETH</p>
            </div>
            <div className="bg-gradient-to-br from-[#232344] to-[#2e2e4d] p-6 rounded-xl border border-[#4deaff33] shadow-lg">
              <h3 className="text-lg font-semibold text-[#4deaff] mb-2">📋 Active Plans</h3>
              <p className="text-2xl font-bold text-blue-400">{merchantStats.activePlans}</p>
            </div>
            <div className="bg-gradient-to-br from-[#232344] to-[#2e2e4d] p-6 rounded-xl border border-[#4deaff33] shadow-lg">
              <h3 className="text-lg font-semibold text-[#4deaff] mb-2">👥 Total Subscribers</h3>
              <p className="text-2xl font-bold text-purple-400">{merchantStats.totalSubscribers}</p>
            </div>
          </div>
        )}

        {/* FeeM Status */}
        {feeMStatus && (
          <div className="bg-gradient-to-br from-[#232344] to-[#2e2e4d] p-6 rounded-xl border border-[#4deaff33] shadow-lg mb-8">
            <h3 className="text-lg font-semibold text-[#4deaff] mb-4">⚡ FeeM Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-300">Status:</p>
                <p className={`font-bold ${feeMStatus.enabled ? 'text-green-400' : 'text-red-400'}`}>
                  {feeMStatus.enabled ? '✅ Enabled' : '❌ Disabled'}
                </p>
              </div>
              <div>
                <p className="text-gray-300">Available:</p>
                <p className={`font-bold ${feeMStatus.available ? 'text-green-400' : 'text-red-400'}`}>
                  {feeMStatus.available ? '✅ Available' : '❌ Unavailable'}
                </p>
              </div>
              <div>
                <p className="text-gray-300">Relayer:</p>
                <p className="font-mono text-xs text-[#4deaff]">
                  {feeMStatus.relayer.slice(0, 6)}...{feeMStatus.relayer.slice(-4)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Create Plan Section */}
        <div className="bg-gradient-to-br from-[#232344] to-[#2e2e4d] p-6 rounded-xl border border-[#4deaff33] shadow-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#4deaff]">📝 Create New Plan</h3>
            <button
              onClick={() => setShowCreatePlan(!showCreatePlan)}
              className="bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
            >
              {showCreatePlan ? 'Cancel' : 'Create Plan'}
            </button>
          </div>

          {showCreatePlan && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Plan Name:</label>
                <input
                  type="text"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                  placeholder="e.g., Premium Plan"
                  className="w-full p-3 bg-[#18182f] border border-[#4deaff] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Amount (ETH):</label>
                <input
                  type="number"
                  step="0.001"
                  value={newPlan.amount}
                  onChange={(e) => setNewPlan({...newPlan, amount: e.target.value})}
                  placeholder="e.g., 0.01"
                  className="w-full p-3 bg-[#18182f] border border-[#4deaff] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Interval (seconds):</label>
                <select
                  value={newPlan.interval}
                  onChange={(e) => setNewPlan({...newPlan, interval: e.target.value})}
                  className="w-full p-3 bg-[#18182f] border border-[#4deaff] rounded-lg text-white"
                >
                  <option value="3600">1 Hour</option>
                  <option value="86400">1 Day</option>
                  <option value="604800">1 Week</option>
                  <option value="2592000">1 Month</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Max Subscribers:</label>
                <input
                  type="number"
                  value={newPlan.maxSubscribers}
                  onChange={(e) => setNewPlan({...newPlan, maxSubscribers: e.target.value})}
                  placeholder="e.g., 1000"
                  className="w-full p-3 bg-[#18182f] border border-[#4deaff] rounded-lg text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={newPlan.supportsNFT}
                    onChange={(e) => setNewPlan({...newPlan, supportsNFT: e.target.checked})}
                    className="rounded"
                  />
                  Support NFT Subscription Passes
                </label>
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={createPlan}
                  disabled={loading || !newPlan.name || !newPlan.amount}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Plans List */}
        <div className="bg-gradient-to-br from-[#232344] to-[#2e2e4d] p-6 rounded-xl border border-[#4deaff33] shadow-lg mb-8">
          <h3 className="text-xl font-semibold text-[#4deaff] mb-4">📋 Your Plans</h3>
          {plans.length === 0 ? (
            <p className="text-gray-400">No plans created yet. Create your first plan above!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#4deaff33]">
                    <th className="text-left py-3 text-[#4deaff]">Plan ID</th>
                    <th className="text-left py-3 text-[#4deaff]">Name</th>
                    <th className="text-left py-3 text-[#4deaff]">Amount</th>
                    <th className="text-left py-3 text-[#4deaff]">Interval</th>
                    <th className="text-left py-3 text-[#4deaff]">Subscribers</th>
                    <th className="text-left py-3 text-[#4deaff]">Status</th>
                    <th className="text-left py-3 text-[#4deaff]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.planId} className="border-b border-[#4deaff11]">
                      <td className="py-3 font-mono text-[#4deaff]">{plan.planId}</td>
                      <td className="py-3">{plan.name}</td>
                      <td className="py-3">{plan.amount} ETH</td>
                      <td className="py-3">{Math.floor(plan.interval / 86400)} days</td>
                      <td className="py-3">{plan.currentSubscribers}/{plan.maxSubscribers}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          plan.active ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {plan.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3">
                        {plan.active && (
                          <button
                            onClick={() => deactivatePlan(plan.planId)}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-gradient-to-br from-[#232344] to-[#2e2e4d] p-6 rounded-xl border border-[#4deaff33] shadow-lg mb-8">
          <h3 className="text-xl font-semibold text-[#4deaff] mb-4">💳 Recent Payments</h3>
          {revenueData.length === 0 ? (
            <p className="text-gray-400">No payments received yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#4deaff33]">
                    <th className="text-left py-3 text-[#4deaff]">User</th>
                    <th className="text-left py-3 text-[#4deaff]">Plan ID</th>
                    <th className="text-left py-3 text-[#4deaff]">Amount</th>
                    <th className="text-left py-3 text-[#4deaff]">Date</th>
                    <th className="text-left py-3 text-[#4deaff]">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData.map((payment, index) => (
                    <tr key={index} className="border-b border-[#4deaff11]">
                      <td className="py-3 font-mono text-[#4deaff]">
                        {payment.user.slice(0, 6)}...{payment.user.slice(-4)}
                      </td>
                      <td className="py-3">{payment.planId}</td>
                      <td className="py-3 text-green-400 font-semibold">{payment.amount} ETH</td>
                      <td className="py-3">{new Date(payment.timestamp).toLocaleDateString()}</td>
                      <td className="py-3">
                        <a
                          href={`https://testnet.soniclabs.com/tx/${payment.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4deaff] hover:underline font-mono text-xs"
                        >
                          {payment.transactionHash.slice(0, 8)}...
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Processing Stats */}
        {processingStats && (
          <div className="bg-gradient-to-br from-[#232344] to-[#2e2e4d] p-6 rounded-xl border border-[#4deaff33] shadow-lg">
            <h3 className="text-xl font-semibold text-[#4deaff] mb-4">⚙️ Payment Processing Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-300 text-sm">Total Payments</p>
                <p className="text-lg font-bold text-[#4deaff]">{processingStats.totalPayments}</p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Success Rate</p>
                <p className="text-lg font-bold text-green-400">{processingStats.successRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Gasless Payments</p>
                <p className="text-lg font-bold text-purple-400">{processingStats.gaslessPayments}</p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Status</p>
                <p className={`text-lg font-bold ${processingStats.isProcessing ? 'text-green-400' : 'text-red-400'}`}>
                  {processingStats.isProcessing ? '🟢 Running' : '🔴 Stopped'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
