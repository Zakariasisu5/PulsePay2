import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { keccak256, toUtf8Bytes, parseUnits, formatUnits } from "ethers";
import '../index.css';
import CreatePlanPopup from '../Components/CreatePlanPopup';
import About from "./About"
import WalletTest from '../Components/WalletTest';
import TransactionExecutor from '../Components/TransactionExecutor';
import { CONTRACTS, ARTIFACTS } from '../utils/addresses';
import { getReadOnlyContract, getWriteContract } from '../utils/contractService';

// Subscription Popup for demo
function SubscriptionPopup({ open, plan, onClose, onConfirm, isProcessing }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(24,24,47,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#232344", borderRadius: "1.2rem", padding: "2rem 2.5rem", boxShadow: "0 8px 32px 0 rgba(77,234,255,0.18)",
        minWidth: 320, maxWidth: "90vw", color: "#fff", textAlign: "center"
      }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: "0.7rem", color: "#4deaff" }}>
          Subscribe to {plan?.title || plan?.name}
        </h2>
        <p style={{ color: "#a78bfa", marginBottom: "1.2rem" }}>{plan?.price}</p>
        <p style={{ color: "#cbd5e1", marginBottom: "1.5rem" }}>
          {isProcessing ? (
            <span style={{ color: "#4deaff", fontWeight: 700 }}>
              Processing blockchain transaction... Please confirm in your wallet.
            </span>
          ) : (
            <>
              Confirm your subscription to <span style={{ color: "#4deaff", fontWeight: 700 }}>{plan?.title || plan?.name}</span> using your connected wallet.
              <br />
              <small style={{ color: "#a78bfa", fontSize: "0.9rem" }}>
                This will create a plan and subscribe you using test tokens.
              </small>
            </>
          )}
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            style={{
              background: isProcessing ? "#666" : "linear-gradient(90deg, #a78bfa 0%, #4deaff 100%)",
              color: "#18182f",
              fontWeight: 700,
              borderRadius: "9999px",
              padding: "0.7rem 2.2rem",
              fontSize: "1.08rem",
              boxShadow: "0 2px 12px 0 rgba(77,234,255,0.10)",
              border: "none",
              cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.6 : 1
            }}
          >
            {isProcessing ? "Processing..." : "Confirm"}
          </button>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: "none",
              color: "#a78bfa",
              fontWeight: 700,
              borderRadius: "9999px",
              padding: "0.7rem 2.2rem",
              fontSize: "1.08rem",
              border: "2px solid #a78bfa",
              cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.6 : 1
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility to get wallet address from localStorage
function getWalletAddress() {
  return typeof window !== 'undefined' ? localStorage.getItem('pulsepay_wallet') : null;
}

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [customPlans, setCustomPlans] = useState([]);
  const [animatedText, setAnimatedText] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const paragraph =
    "Create, manage, and subscribe to decentralized services with gasless transactions and secure blockchain payments.";
  const intervalRef = useRef();

  // Animated typing effect for the paragraph, loops infinitely, slower and smoother
  useEffect(() => {
    let idx = 0;
    let typingTimeout;
    function startTyping() {
      typingTimeout = setTimeout(function type() {
        setAnimatedText(paragraph.slice(0, idx + 1));
        idx++;
        if (idx === paragraph.length) {
          setTimeout(() => {
            idx = 0;
            setAnimatedText("");
            typingTimeout = setTimeout(type, 350); // Pause before restarting
          }, 1600); // Longer pause at end
        } else {
          typingTimeout = setTimeout(type, 55); // Slower, smoother typing
        }
      }, 55);
    }
    startTyping();
    return () => clearTimeout(typingTimeout);
  }, []);

  const handleCreatePlan = (plan) => {
    setCustomPlans([...customPlans, plan]);
  };

  // Handle subscribe for featured and custom plans
  const handleSubscribeClick = (plan) => {
    setSelectedPlan(plan);
    setPopupOpen(true);
  };

  const handleConfirm = async () => {
    const walletAddress = getWalletAddress();
    if (!walletAddress) {
      alert("Please connect your wallet before subscribing to a plan.");
      setPopupOpen(false);
      return;
    }

    setIsProcessing(true);

    try {
      // Get the provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Simple ERC20 ABI for basic functions
      const erc20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) external view returns (uint256)",
        "function mint(address to, uint256 amount) external",
        "function transfer(address to, uint256 amount) external returns (bool)"
      ];
      
      // Simple Subscription ABI
      const subscriptionAbi = [
        "function createPlan(bytes32 planId, string memory name, uint256 amount, uint256 interval) external",
        "function subscribe(bytes32 planId) external",
        "function getPlan(bytes32 planId) external view returns (string memory, uint256, uint256)"
      ];
      
      // Get the subscription contract
      const subscriptionContract = new ethers.Contract(CONTRACTS.SUBSCRIPTION, subscriptionAbi, signer);
      
             // Get the token contract
       const tokenContract = new ethers.Contract(CONTRACTS.MOCK_ERC20, erc20Abi, signer);

       console.log("Token contract address:", CONTRACTS.MOCK_ERC20);
       console.log("Subscription contract address:", CONTRACTS.SUBSCRIPTION);

       // Convert ETH price to token amount (assuming 1 ETH = 1000 MTK for demo)
       const ethPrice = parseFloat(selectedPlan.price.replace(' ETH', ''));
       const tokenAmount = parseUnits((ethPrice * 1000).toString(), 18); // Convert to wei

       // Check token balance first
       console.log("Checking token balance...");
       const balance = await tokenContract.balanceOf(walletAddress);
       console.log("Current balance:", formatUnits(balance, 18), "MTK");
       console.log("Required amount:", formatUnits(tokenAmount, 18), "MTK");
       
       if (balance < tokenAmount) {
         throw new Error(`Insufficient token balance. You have ${formatUnits(balance, 18)} MTK but need ${formatUnits(tokenAmount, 18)} MTK. Please mint more tokens first.`);
       }

      // First, approve tokens for the subscription contract
      console.log("Approving tokens...");
      console.log("Approving amount:", tokenAmount.toString());
      const approveTx = await tokenContract.approve(CONTRACTS.SUBSCRIPTION, tokenAmount);
      await approveTx.wait();
      console.log("Tokens approved!");

             // Create a plan first (if it doesn't exist)
       const planName = selectedPlan.title || selectedPlan.name;
       const planId = keccak256(toUtf8Bytes(planName));
      
      console.log("Creating plan...");
      const createPlanTx = await subscriptionContract.createPlan(
        planId,
        planName,
        tokenAmount,
        30 * 24 * 60 * 60 // 30 days in seconds
      );
      await createPlanTx.wait();
      console.log("Plan created!");

      // Subscribe to the plan
      console.log("Subscribing to plan...");
      const subscribeTx = await subscriptionContract.subscribe(planId);
      await subscribeTx.wait();
      console.log("Subscription successful!");

      // Save subscription to localStorage for Dashboard
      const sub = {
        plan: planName,
                 balance: `${formatUnits(tokenAmount, 18)} MTK`,
        status: "Active",
        renewal: new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10), // +30 days
      };
      localStorage.setItem('pulsepay_subscription', JSON.stringify(sub));
      
      setPopupOpen(false);
      alert(`Successfully subscribed to ${planName}! Transaction completed on blockchain.`);
      
    } catch (error) {
      console.error("Transaction failed:", error);
      alert(`Transaction failed: ${error.message}`);
      setPopupOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Replace the featured plans array with themed images
  const featuredPlans = [
    {
      title: 'Premium Streaming Bundle',
      desc: 'Enjoy unlimited access to top movies, music, and live events. All-in-one entertainment, gasless and secure.',
      price: '0.05 ETH',
      img: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80', // Streaming
    },
    {
      title: 'Pro Productivity Suite',
      desc: 'Unlock advanced tools for teams: cloud docs, AI assistants, and seamless collaboration. Boost your workflow today.',
      price: '0.03 ETH',
      img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80', // Dev Pro / AI
    },
    {
      title: 'Web3 Learning Hub',
      desc: 'Access premium courses, expert webinars, and certification tracks. Learn blockchain, DeFi, and more—at your pace.',
      price: '0.02 ETH',
      img: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80', // Web3 / Dapp
    },
    {
      title: 'Gaming VIP',
      desc: 'Exclusive access to top blockchain games, tournaments, and in-game rewards.',
      price: '0.03 ETH',
      img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80', // Gaming
    },
    {
      title: 'Community Gold',
      desc: 'Join premium communities, unlock special events, and connect with top creators.',
      price: '0.04 ETH',
      img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', // Community
    },
    {
      title: 'AI Assistant',
      desc: 'Get access to advanced AI tools for productivity, creativity, and automation.',
      price: '0.07 ETH',
      img: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80', // AI
    },
  ];

  return (
    <div className="home-hero min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="animated-bg-blobs">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
        <div className="blob blob3"></div>
      </div>
      {/* Animated Decorative Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[120vw] h-[60vh] bg-gradient-to-tr from-pulse-cyan/30 via-pulse-purple/20 to-transparent rounded-b-full blur-2xl animate-pulse-slow"></div>
        <div className="absolute right-0 bottom-0 w-1/2 h-1/2 bg-pulse-purple/20 rounded-full blur-3xl animate-blob-move"></div>
      </div>
      {/* Hero Section */}
      <section className="home-hero-section text-center relative z-10 flex-1 flex flex-col justify-center">
        <div className="home-hero-content mx-auto px-4 max-w-2xl">
          <h1 className="home-hero-title gradient-text drop-shadow-xl text-5xl md:text-6xl font-extrabold leading-tight mb-4 animate-fade-in">
            Build or Subscribe to <br />
            <span className="text-pulse-purple animate-gradient-x bg-gradient-to-r from-pulse-purple via-pulse-cyan to-pulse-purple bg-clip-text text-transparent">
              Web3
            </span>{" "}
            Plans
          </h1>
          <p className="home-hero-subtitle text-lg md:text-xl text-white/80 mb-7 animate-fade-in delay-100" style={{ minHeight: 56 }}>
            {animatedText}
            <span className="animate-pulse text-pulse-cyan font-semibold">
              {animatedText.length < paragraph.length ? "|" : ""}
            </span>
          </p>
          <div className="home-hero-actions flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in delay-200">
            <Link
              to="/plans"
              className="btn-ghost home-hero-btn-primary px-4 py-1.5 text-sm font-bold shadow hover:scale-105 transition-transform duration-200 relative overflow-hidden group"
              style={{ boxShadow: '0 2px 8px 0 rgba(77,234,255,0.10)', borderRadius: '0.375rem' }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-pulse-cyan to-pulse-purple shadow">
                  <svg width="25" height="25" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" fill="#232344" />
                    <path d="M13.5 13.5L17 17" stroke="#4deaff" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="9" cy="9" r="4" stroke="#4deaff" strokeWidth="1.5"/>
                  </svg>
                </span>
                <b>Explore Plans</b>
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-pulse-cyan/30 via-pulse-purple/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></span>
            </Link>
            <button
              className="btn-ghost home-hero-btn-secondary px-4 py-1.5 text-sm font-bold shadow hover:scale-105 transition-transform duration-200 border-2 border-pulse-cyan hover:border-pulse-purple relative overflow-hidden group"
              onClick={() => setShowModal(true)}
              style={{ boxShadow: '0 2px 8px 0 rgba(167,139,250,0.10)', borderRadius: '0.375rem' }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-pulse-cyan to-pulse-purple shadow">
                  <svg width="25" height="25" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" fill="#232344" />
                    <path d="M10 6v8M6 10h8" stroke="#4deaff" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                <b>Create Plan</b>
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-pulse-purple/20 via-pulse-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></span>
            </button>
          </div>
        </div>
      </section>

      {/* Popup for custom plan */}
      <CreatePlanPopup show={showModal} onClose={() => setShowModal(false)} onCreate={handleCreatePlan} />
      <br /> <br /> <br /> <br />
      {/* Featured Plans Section */}
      <section className="home-featured-section relative overflow-visible py-20 px-2 md:px-0">
        {/* Animated Decorative Background */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[90vw] h-[40vh] bg-gradient-to-tr from-pulse-purple/30 via-pulse-cyan/20 to-transparent rounded-b-full blur-2xl animate-pulse-slow"></div>
          <div className="absolute right-0 bottom-0 w-1/3 h-1/3 bg-pulse-cyan/20 rounded-full blur-3xl animate-blob-move"></div>
        </div>
        {/* Section Divider */}
        <div className="w-full flex justify-center mb-10">
          <span className="inline-block w-32 h-1 rounded-full bg-gradient-to-r from-pulse-cyan via-pulse-purple to-pulse-cyan opacity-60 animate-pulse"></span>
        </div>
        <div className="home-featured-content mx-auto max-w-6xl">
          <h2 className="home-featured-title gradient-text text-4xl md:text-5xl font-extrabold mb-2 animate-fade-in">Featured Plans</h2>
          <p className="home-featured-subtitle text-lg md:text-xl mb-10 animate-fade-in delay-100">Discover top subscription options across various categories</p>
          <div className="home-featured-grid gap-10">
            {featuredPlans.map((plan, i) => (
              <div key={i} className="card home-featured-card relative overflow-hidden group shadow-2xl border border-pulse-cyan/30 hover:border-pulse-purple/50 transition-all duration-300">
                <img className="plan-card-image w-full transition-transform duration-500 group-hover:scale-105" src={plan.img} alt={plan.title} />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#232344ee] via-transparent to-transparent pointer-events-none z-10"></div>
                {/* Badge */}
                <span className="absolute top-4 left-4 z-20 px-4 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white shadow-lg tracking-wide animate-pulse">Featured</span>
                <div className="p-7 relative z-20 flex flex-col items-start">
                  <h3 className="home-featured-card-title mb-2 flex items-center gap-2 text-xl font-bold">
                    <span className="inline-block w-2 h-2 rounded-full bg-pulse-cyan animate-ping"></span>
                    {plan.title} <span className="ml-2 text-pulse-cyan font-semibold">{plan.price}</span>
                  </h3>
                  <p className="home-featured-card-desc mb-6 text-base">{plan.desc}</p>
                  <button
                    className="btn-ghost home-featured-card-btn w-full bg-gradient-to-r from-pulse-purple to-pulse-cyan text-white font-bold py-2.5 rounded-full shadow-xl hover:from-pulse-cyan hover:to-pulse-purple transition-all duration-300 scale-100 group-hover:scale-105 text-lg tracking-wide"
                    onClick={() => handleSubscribeClick(plan)}
                  >
                    Subscribe
                  </button>
                </div>
              </div>
            ))}
            {customPlans.map((plan, idx) => (
              <div
                key={"custom-" + idx}
                className="relative overflow-hidden group shadow-2xl border-2 border-dashed border-pulse-cyan rounded-2xl bg-gradient-to-br from-[#1e293b] via-[#232344] to-[#4deaff22] hover:scale-[1.025] transition-transform duration-300 min-h-[340px] flex flex-col justify-between"
                style={{ boxShadow: '0 8px 32px 0 rgba(77,234,255,0.18), 0 1.5px 8px 0 rgba(178,89,255,0.13)' }}
              >
                {/* Decorative Icon */}
                <div className="absolute top-4 right-4 z-30">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-pulse-cyan to-pulse-purple shadow-lg border-4 border-white/10 animate-spin-slow">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41m12.02 0l-1.41-1.41M6.34 6.34L4.93 4.93" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                  </span>
                </div>
                {/* Custom Plan Badge */}
                <span className="absolute top-4 left-4 z-20 px-4 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white shadow-lg tracking-wide animate-bounce">Future Plan</span>
                {/* Plan Content */}
                <div className="p-7 pt-16 relative z-20 flex flex-col items-start flex-1 w-full">
                  <h3 className="text-xl font-extrabold text-pulse-cyan mb-2 flex items-center gap-2 drop-shadow-lg">
                    <span className="inline-block w-3 h-3 rounded-full bg-pulse-cyan animate-pulse"></span>
                    {plan.name} <span className="ml-2 text-pulse-purple font-semibold text-lg">{plan.price}</span>
                  </h3>
                  <p className="text-base text-white/90 mb-6 font-medium drop-shadow-sm">{plan.desc || 'Your custom subscription plan.'}</p>
                  <button
                    className="mt-auto btn-ghost w-full bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white font-bold py-2.5 rounded-full shadow-xl hover:from-pulse-purple hover:to-pulse-cyan transition-all duration-300 scale-100 group-hover:scale-105 text-lg tracking-wide"
                    onClick={() => handleSubscribeClick(plan)}
                  >
                    Subscribe
                  </button>
                </div>
                {/* Decorative Glow */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-pulse-cyan opacity-20 rounded-full blur-2xl z-10"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <About/>
      
      {/* Temporary Wallet Test Component */}
      <div className="py-20">
        <WalletTest />
      </div>
      
      {/* Transaction Executor Component */}
      <div className="py-20">
        <TransactionExecutor />
      </div>
      
      <SubscriptionPopup
        open={popupOpen}
        plan={selectedPlan}
        onClose={() => setPopupOpen(false)}
        onConfirm={handleConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
}
