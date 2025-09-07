// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SonicSubscrypt - Advanced Subscription Platform for Sonic Network
 * @dev Leverages Sonic's FeeM, high throughput, and low gas costs for:
 * - Gasless transactions via FeeM
 * - High-frequency micro-billing
 * - NFT subscription passes
 * - Multi-token support
 * - Real-time analytics
 */
contract SonicSubscrypt is ReentrancyGuard {
    // Core state variables
    address public owner;
    address public feeMRelayer; // Sonic FeeM relayer address
    bool public feeMEnabled;
    
    // Token support
    mapping(address => bool) public supportedTokens;
    address public defaultToken;
    
    // Plan management
    uint256 private _planIds = 0;
    mapping(uint256 => Plan) public plans;
    
    // Subscription management
    mapping(address => Subscription) public subscriptions;
    mapping(address => uint256[]) public userSubscriptions;
    
    // NFT subscription passes
    uint256 private _tokenIds = 0;
    mapping(uint256 => address) public tokenOwners;
    mapping(address => uint256) public userTokenId;
    
    // Analytics and events
    uint256 public totalRevenue;
    uint256 public totalSubscriptions;
    mapping(address => uint256) public merchantRevenue;
    
    // Sonic-specific settings
    uint256 public constant MIN_BILLING_INTERVAL = 1 minutes; // Sonic enables 1-minute billing
    uint256 public constant MAX_BILLING_INTERVAL = 30 days;
    
    struct Plan {
        uint256 planId;
        string name;
        uint256 amount;
        uint256 interval; // in seconds
        address merchant;
        bool active;
        bool supportsNFT;
        uint256 maxSubscribers;
        uint256 currentSubscribers;
    }
    
    struct Subscription {
        uint256 planId;
        uint256 nextPaymentTime;
        uint256 lastPaymentTime;
        bool active;
        uint256 totalPaid;
        uint256 nftTokenId; // 0 if no NFT
    }
    
    // Events for Sonic Indexer integration
    event PlanCreated(
        uint256 indexed planId, 
        address indexed merchant, 
        string name,
        uint256 amount, 
        uint256 interval,
        bool supportsNFT
    );
    event Subscribed(
        address indexed user, 
        uint256 indexed planId, 
        uint256 nextPaymentTime,
        uint256 nftTokenId
    );
    event Charged(
        address indexed user, 
        uint256 indexed planId, 
        uint256 amount,
        uint256 timestamp
    );
    event Cancelled(
        address indexed user, 
        uint256 indexed planId,
        uint256 nftTokenId
    );
    event NFTMinted(
        address indexed user,
        uint256 indexed tokenId,
        uint256 indexed planId
    );
    event FeeMEnabled(address indexed relayer);
    event TokenSupported(address indexed token, bool supported);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier onlyFeeMOrOwner() {
        require(
            msg.sender == feeMRelayer || 
            msg.sender == owner || 
            !feeMEnabled,
            "Only FeeM relayer or owner"
        );
        _;
    }
    
    modifier onlySupportedToken(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }
    
    constructor(
        address _defaultToken,
        address _feeMRelayer
    ) {
        owner = msg.sender;
        defaultToken = _defaultToken;
        feeMRelayer = _feeMRelayer;
        feeMEnabled = _feeMRelayer != address(0);
        
        // Support default token
        supportedTokens[_defaultToken] = true;
        
        if (feeMEnabled) {
            emit FeeMEnabled(_feeMRelayer);
        }
    }
    
    // ========== PLAN MANAGEMENT ==========
    
    function createPlan(
        string memory name,
        uint256 amount,
        uint256 interval,
        bool supportsNFT,
        uint256 maxSubscribers
    ) external returns (uint256) {
        require(amount > 0, "Amount must be positive");
        require(
            interval >= MIN_BILLING_INTERVAL && 
            interval <= MAX_BILLING_INTERVAL,
            "Invalid interval"
        );
        require(maxSubscribers > 0, "Max subscribers must be positive");
        
        uint256 planId = _planIds;
        _planIds++;
        
        plans[planId] = Plan({
            planId: planId,
            name: name,
            amount: amount,
            interval: interval,
            merchant: msg.sender,
            active: true,
            supportsNFT: supportsNFT,
            maxSubscribers: maxSubscribers,
            currentSubscribers: 0
        });
        
        emit PlanCreated(planId, msg.sender, name, amount, interval, supportsNFT);
        return planId;
    }
    
    // ========== SUBSCRIPTION MANAGEMENT ==========
    
    function subscribe(
        uint256 planId,
        address token
    ) external onlySupportedToken(token) nonReentrant {
        Plan storage plan = plans[planId];
        require(plan.active, "Plan is inactive");
        require(
            plan.currentSubscribers < plan.maxSubscribers,
            "Plan is full"
        );
        require(
            subscriptions[msg.sender].planId != planId || 
            !subscriptions[msg.sender].active,
            "Already subscribed to this plan"
        );
        
        // Create or update subscription
        Subscription storage sub = subscriptions[msg.sender];
        sub.planId = planId;
        sub.nextPaymentTime = block.timestamp; // First payment can be processed immediately
        sub.lastPaymentTime = 0; // No previous payment
        sub.active = true;
        sub.totalPaid = 0;
        
        // Mint NFT if supported
        if (plan.supportsNFT) {
            uint256 tokenId = _mintSubscriptionNFT(msg.sender, planId);
            sub.nftTokenId = tokenId;
        }
        
        // Update plan subscriber count
        plan.currentSubscribers++;
        
        // Add to user's subscription list
        userSubscriptions[msg.sender].push(planId);
        totalSubscriptions++;
        
        emit Subscribed(msg.sender, planId, sub.nextPaymentTime, sub.nftTokenId);
    }
    
    // ========== PAYMENT PROCESSING ==========
    
    function processPayment(
        address user,
        address token
    ) external onlyFeeMOrOwner onlySupportedToken(token) nonReentrant {
        Subscription storage sub = subscriptions[user];
        require(sub.active, "No active subscription");
        
        Plan storage plan = plans[sub.planId];
        require(plan.active, "Plan is inactive");
        require(
            block.timestamp >= sub.nextPaymentTime,
            "Too early to charge"
        );
        
        // Transfer tokens from user to merchant
        IERC20(token).transferFrom(user, plan.merchant, plan.amount);
        
        // Update subscription state
        sub.lastPaymentTime = block.timestamp;
        sub.nextPaymentTime = block.timestamp + plan.interval;
        sub.totalPaid += plan.amount;
        
        // Update analytics
        totalRevenue += plan.amount;
        merchantRevenue[plan.merchant] += plan.amount;
        
        emit Charged(user, sub.planId, plan.amount, block.timestamp);
    }
    
    // Batch payment processing for high-frequency billing
    function processBatchPayments(
        address[] memory users,
        address token
    ) external onlyFeeMOrOwner onlySupportedToken(token) nonReentrant {
        for (uint256 i = 0; i < users.length; i++) {
            if (subscriptions[users[i]].active) {
                _processSinglePayment(users[i], token);
            }
        }
    }
    
    function _processSinglePayment(address user, address token) internal {
        Subscription storage sub = subscriptions[user];
        Plan storage plan = plans[sub.planId];
        
        if (!plan.active || block.timestamp < sub.nextPaymentTime) {
            return;
        }
        
        IERC20(token).transferFrom(user, plan.merchant, plan.amount);
        
        sub.lastPaymentTime = block.timestamp;
        sub.nextPaymentTime = block.timestamp + plan.interval;
        sub.totalPaid += plan.amount;
        
        totalRevenue += plan.amount;
        merchantRevenue[plan.merchant] += plan.amount;
        
        emit Charged(user, sub.planId, plan.amount, block.timestamp);
    }
    
    // ========== NFT SUBSCRIPTION PASSES ==========
    
    function _mintSubscriptionNFT(
        address user,
        uint256 planId
    ) internal returns (uint256) {
        uint256 tokenId = _tokenIds;
        _tokenIds++;
        
        tokenOwners[tokenId] = user;
        userTokenId[user] = tokenId;
        
        emit NFTMinted(user, tokenId, planId);
        return tokenId;
    }
    
    function getSubscriptionNFT(address user) external view returns (uint256) {
        return userTokenId[user];
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    function setFeeMRelayer(address _relayer) external onlyOwner {
        feeMRelayer = _relayer;
        feeMEnabled = _relayer != address(0);
        emit FeeMEnabled(_relayer);
    }
    
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
        emit TokenSupported(token, true);
    }
    
    function removeSupportedToken(address token) external onlyOwner {
        require(token != defaultToken, "Cannot remove default token");
        supportedTokens[token] = false;
        emit TokenSupported(token, false);
    }
    
    function setDefaultToken(address token) external onlyOwner {
        require(supportedTokens[token], "Token not supported");
        defaultToken = token;
    }
    
    function deactivatePlan(uint256 planId) external {
        require(
            msg.sender == plans[planId].merchant || 
            msg.sender == owner,
            "Not authorized"
        );
        plans[planId].active = false;
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    function getPlan(uint256 planId) external view returns (Plan memory) {
        return plans[planId];
    }
    
    function getUserSubscription(address user) external view returns (Subscription memory) {
        return subscriptions[user];
    }
    
    function getUserSubscriptions(address user) external view returns (uint256[] memory) {
        return userSubscriptions[user];
    }
    
    function getMerchantStats(address merchant) external view returns (
        uint256 revenue,
        uint256 activePlans,
        uint256 totalSubscribers
    ) {
        revenue = merchantRevenue[merchant];
        
        uint256 plansCount = 0;
        uint256 subscribersCount = 0;
        
        for (uint256 i = 0; i < _planIds; i++) {
            if (plans[i].merchant == merchant) {
                if (plans[i].active) {
                    plansCount++;
                }
                subscribersCount += plans[i].currentSubscribers;
            }
        }
        
        return (revenue, plansCount, subscribersCount);
    }
    
    function getGlobalStats() external view returns (
        uint256 totalRev,
        uint256 totalSubs,
        uint256 totalPlans
    ) {
        return (totalRevenue, totalSubscriptions, _planIds);
    }
    
    // ========== EMERGENCY FUNCTIONS ==========
    
    function cancelSubscription(address user) external onlyOwner {
        Subscription storage sub = subscriptions[user];
        require(sub.active, "No active subscription");
        
        Plan storage plan = plans[sub.planId];
        plan.currentSubscribers--;
        
        sub.active = false;
        totalSubscriptions--;
        
        emit Cancelled(user, sub.planId, sub.nftTokenId);
    }
    
    function withdrawFees(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }
}
