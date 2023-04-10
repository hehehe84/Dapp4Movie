const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    // Deployment of NFTCollectionFactory contract
    const NFTCollectionFactory = await hre.ethers.getContractFactory("NFTCollectionFactory");
    const nftCollectionFactory = await NFTCollectionFactory.deploy();
    await nftCollectionFactory.deployed();
    const txhash1 = await deployer.provider.getTransactionReceipt(nftCollectionFactory.deployTransaction.hash);
    console.log("Transaction hash:", txhash1.transactionHash);
    console.log("");
    console.log("NFTCollectionFactory deployed to:", nftCollectionFactory.address);
    
    // Save the deployed contract address to the constants file
    const constantsFilePath = '../FrontEnd/public/constants.js';
    const constantsFileContent = fs.readFileSync(constantsFilePath, 'utf8');
    const updatedAddr = constantsFileContent.replace(/addressLocal: ".*"/, `addressLocal: "${nftCollectionFactory.address}"`);
    const combinedContent = updatedAddr.replace(/txlocalhash: ".*"/, `txlocalhash: "${txhash1.transactionHash}"`);
    fs.writeFileSync(constantsFilePath, combinedContent, 'utf8');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
