require("dotenv").config();

require("@nomicfoundation/hardhat-toolbox");

const { RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.20" },
      { version: "0.8.28" }
    ]
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    },
    sonicTestnet: {
      url: "https://rpc-testnet.soniclabs.com",
      chainId: 64165,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 1000000000, // 1 gwei
      timeout: 60000
    },
    sonicMainnet: {
      url: "https://rpc.soniclabs.com",
      chainId: 146,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 1000000000, // 1 gwei
      timeout: 60000
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || ""
  }
};


