const fs = require('fs');
const path = require('path');

// Read deployment output and update .env file
function updateAddresses() {
  try {
    // Use the actual deployed addresses from your deployment
    const addresses = {
      SUBSCRIPTION: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      MOCK_ERC20: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    };

    // Create .env content
    const envContent = `# Network Configuration
VITE_CHAIN_ID=31337
VITE_NETWORK_NAME=hardhat

# Contract Addresses
VITE_SUBSCRIPTION_ADDRESS=${addresses.SUBSCRIPTION}
VITE_MOCK_ERC20_ADDRESS=${addresses.MOCK_ERC20}

# Optional: For production deployment
# RPC_URL=
# PRIVATE_KEY=
# ETHERSCAN_API_KEY=
`;

    // Write to .env file
    fs.writeFileSync('.env', envContent);
    console.log('✅ Environment variables updated successfully!');
    console.log('📝 Contract Addresses:');
    console.log(`   Subscription: ${addresses.SUBSCRIPTION}`);
    console.log(`   MockERC20: ${addresses.MOCK_ERC20}`);
    
  } catch (error) {
    console.error('❌ Error updating addresses:', error);
  }
}

updateAddresses();
