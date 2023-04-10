const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const deployer = (await hre.ethers.getSigners())[0];
    
    console.log("Deploying MarketPlace contract with the account:", deployer.address);

    //Deploy The MarketPlaceNFT 
    const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
    const nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.deployed();
    const txhashM = await deployer.provider.getTransactionReceipt(nftMarketplace.deployTransaction.hash);

    console.log("Transaction hash:", txhashM.transactionHash);
    console.log("");
    console.log("NFTMarketplace deployed to:", nftMarketplace.address);
    console.log("");    

    // Save the deployed contract address to the constants file
    const constantsFilePath = '../FrontEnd/public/constants.js';
    const constantsFileContent = fs.readFileSync(constantsFilePath, 'utf8');
    const updatedAddr = constantsFileContent.replace(/address: ".*"/, `address: "${nftMarketplace.address}"`);
    const combinedContent = updatedAddr.replace(/txhashM: ".*"/, `txhashM: "${txhashM.transactionHash}"`);
    fs.writeFileSync(constantsFilePath, combinedContent, 'utf8');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

