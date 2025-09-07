import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { useState, useEffect } from "react";
import { connectWallet, disconnectWallet } from "../utils/wallet"; // <-- import the shared wallet logic

export default function Navbar() {
  const { user } = useAuth();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    const addr = localStorage.getItem("pulsepay_wallet");
    if (addr) setWalletAddress(addr);
  }, []);

  async function handleConnectWallet() {
    await connectWallet(setWalletAddress); // uses shared logic, shows wallet modal
  }

  async function handleDisconnectWallet() {
    await disconnectWallet(setWalletAddress);
  }

  const isActive = (to) =>
    loc.pathname === to ? "text-cyan-400 font-bold" : "";

  return (
    <nav className="navbar-glass">
      {/* Logo */}
      <Link to="/" className="navbar-logo flex items-center gap-2 text-center">
        {/* Generated icon */}
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-pulse-cyan to-pulse-purple shadow-md mr-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#232344" />
            <path d="M6 10a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm4-7v2m0 10v2m7-7h-2M3 10H1m13.07-5.07l-1.41 1.41M6.34 15.66l-1.41 1.41m12.02 0l-1.41-1.41M6.34 4.34L4.93 2.93" stroke="#4deaff" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </span>
        <span className="text-purple-500">Pulse</span>
        <span className="text-cyan-400">Pay</span>
      </Link>

      {/* Hamburger for mobile */}
      <button
        className="navbar-hamburger md:hidden"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          {menuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
          )}
        </svg>
      </button>

      {/* Desktop Links */}
      <div className="hidden md:flex space-x-8 font-medium">
        <Link to="/" className={`navbar-link ${isActive("/")}`}>Home</Link>
        <Link to="/plans" className={`navbar-link ${isActive("/plans")}`}>Explore Plans</Link>
        <Link to="/dashboard" className={`navbar-link ${isActive("/dashboard")}`}>Dashboard</Link>
        <Link to="/merchant" className={`navbar-link ${isActive("/merchant")}`}>Merchant</Link>
      </div>

      {/* Desktop Auth/Wallet */}
      <div className="hidden md:flex items-center gap-3">
        {user ? (
          walletAddress ? (
            <div className="flex items-center gap-2">
              <div className="navbar-wallet bg-[#232344] px-3 py-2 rounded-full text-[#4deaff] font-semibold shadow border border-[#4deaff] text-xs md:text-base">
                Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
              <button 
                onClick={handleDisconnectWallet} 
                className="navbar-wallet border-red-500 text-red-400 text-xs md:text-base"
                title="Disconnect Wallet"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={handleConnectWallet} className="navbar-wallet">Connect Wallet</button>
          )
        ) : (
          <>
            <Link to="/signin" className="navbar-wallet border-purple-500 text-purple-400">Sign In</Link>
            <Link to="/signup" className="navbar-wallet">Get Started</Link>
          </>
        )}
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#18182fdd] backdrop-blur-sm flex flex-col"
          style={{ transition: "opacity 0.3s" }}
        >
          <button
            className="absolute top-5 right-5 text-cyan-400"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex flex-col items-center justify-center h-full w-full space-y-10 pt-20">
            <Link to="/" className={`navbar-link text-xl ${isActive("/")}`} onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/plans" className={`navbar-link text-xl ${isActive("/plans")}`} onClick={() => setMenuOpen(false)}>Explore Plans</Link>
            <Link to="/dashboard" className={`navbar-link text-xl ${isActive("/dashboard")}`} onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <Link to="/merchant" className={`navbar-link text-xl ${isActive("/merchant")}`} onClick={() => setMenuOpen(false)}>Merchant</Link>
            <div className="flex flex-col items-center gap-6 mt-10 w-full">
              {user ? (
                walletAddress ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="navbar-wallet bg-[#232344] px-3 py-2 rounded-full text-[#4deaff] font-semibold shadow border border-[#4deaff] text-lg">
                      Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </div>
                    <button 
                      onClick={() => { handleDisconnectWallet(); setMenuOpen(false); }} 
                      className="navbar-wallet border-red-500 text-red-400 text-lg"
                      title="Disconnect Wallet"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { handleConnectWallet(); setMenuOpen(false); }} className="navbar-wallet text-lg">Connect Wallet</button>
                )
              ) : (
                <>
                  <Link to="/signin" className="navbar-wallet border-purple-500 text-purple-400 text-lg" onClick={() => setMenuOpen(false)}>Sign In</Link>
                  <Link to="/signup" className="navbar-wallet text-lg" onClick={() => setMenuOpen(false)}>Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}