const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying to Sonic Network...");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Deploy MockERC20 token
  console.log("\n📦 Deploying MockERC20...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("SonicPay Token", "SPT");
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ MockERC20 deployed at:", tokenAddress);

  // Get Sonic ETH address (native token)
  const sonicETH = "0x0000000000000000000000000000000000000000"; // Sonic ETH is native token
  
  // Deploy SonicSubscrypt with FeeM support
  console.log("\n🎯 Deploying SonicSubscrypt...");
  const Subscription = await hre.ethers.getContractFactory("SonicSubscrypt");
  
  // For testnet, we'll use a placeholder FeeM relayer address
  // In production, this would be the actual FeeM relayer
  const feeMRelayer = process.env.FEEM_RELAYER_ADDRESS || "0x1234567890123456789012345678901234567890";
  
  const subscription = await Subscription.deploy(tokenAddress, feeMRelayer);
  await subscription.waitForDeployment();
  const subscriptionAddress = await subscription.getAddress();
  console.log("✅ SonicSubscrypt deployed at:", subscriptionAddress);

  // Add Sonic ETH as supported token
  console.log("\n🔧 Configuring supported tokens...");
  await subscription.addSupportedToken(sonicETH);
  console.log("✅ Added Sonic ETH as supported token");

  // Verify FeeM status
  const feeMEnabled = await subscription.feeMEnabled();
  console.log("✅ FeeM Enabled:", feeMEnabled);

  // Create a sample plan for testing
  console.log("\n📋 Creating sample subscription plan...");
  const samplePlanTx = await subscription.createPlan(
    "Sonic Premium",
    hre.ethers.parseEther("0.01"), // 0.01 ETH
    86400, // 1 day interval
    true, // supports NFT
    1000 // max subscribers
  );
  await samplePlanTx.wait();
  console.log("✅ Sample plan created");

  // Get contract info
  const totalRevenue = await subscription.totalRevenue();
  const totalSubscriptions = await subscription.totalSubscriptions();
  
  console.log("\n📊 Contract Information:");
  console.log("Total Revenue:", hre.ethers.formatEther(totalRevenue), "ETH");
  console.log("Total Subscriptions:", totalSubscriptions.toString());

  // Save addresses to file for frontend
  const addresses = {
    network: network.name,
    chainId: network.chainId.toString(),
    subscription: subscriptionAddress,
    mockERC20: tokenAddress,
    sonicETH: sonicETH,
    feeMRelayer: feeMRelayer,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const fs = require('fs');
  fs.writeFileSync('./deployed-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\n💾 Addresses saved to deployed-addresses.json");

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📝 Next Steps:");
  console.log("1. Update your .env file with the contract addresses");
  console.log("2. Run: npm run dev to start the frontend");
  console.log("3. Test the subscription functionality");
  console.log("4. Deploy to Sonic mainnet when ready");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
