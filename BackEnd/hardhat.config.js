require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-truffle5");
require("hardhat-contract-sizer");

const INFURA_ID= process.env.INFURA_ID || "";
const ALCHEMY_MUMBAI= process.env.ALCHEMY_MUMBAI || "";
const PRIVATE_KEY= process.env.PRIVATE_KEY || "";
const POLYSCAN_API_KEY=process.env.POLYSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_MUMBAI}`,
      accounts:[`0x${PRIVATE_KEY}`],
      chainId: 80001,
    }
  },
  etherscan: {
    apiKey: POLYSCAN_API_KEY,
  },
  // solidity: "0.8.18",
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200 // Adjust this value according to your needs
      },
      metadata: {
        bytecodeHash: "none"
      }
    }
  }
};