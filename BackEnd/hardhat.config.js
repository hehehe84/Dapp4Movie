require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
require("@nomiclabs/hardhat-etherscan");

const INFURA_ID= process.env.INFURA_ID || "";
const ALCHEMY_MUMBAI= process.env.ALCHEMY_MUMBAI || "";
const PRIVATE_KEY= process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY=process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      //accounts : Merci hardhat :D !
      chainId: 31337,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: [`0x${PRIVATE_KEY}`],
      chainId: 5,
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_MUMBAI}`,
      accounts:[`0x${PRIVATE_KEY}`],
      chainId: 80001,
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  solidity: "0.8.18",
};