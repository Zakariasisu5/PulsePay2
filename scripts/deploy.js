const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("MockToken", "MTK");
  await token.waitForDeployment();
  console.log("MockERC20 deployed at:", await token.getAddress());

  const defaultToken = await token.getAddress();
  const feeMRelayer = hre.ethers.ZeroAddress;

  const Subscription = await hre.ethers.getContractFactory("SonicSubscrypt");
  const subscription = await Subscription.deploy(defaultToken, feeMRelayer);
  await subscription.waitForDeployment();
  console.log("SonicSubscrypt deployed at:", await subscription.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


