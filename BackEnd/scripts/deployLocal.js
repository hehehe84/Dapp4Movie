const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    // Deployment of NFTCollectionFactory contract
    const NFTCollectionFactory = await hre.ethers.getContractFactory("NFTCollectionFactory");
    const nftCollectionFactory = await NFTCollectionFactory.deploy();
    await nftCollectionFactory.deployed();
    console.log("NFTCollectionFactory deployed to:", nftCollectionFactory.address);
    
    // Save the deployed contract address to the constants file
    const constantsFilePath = '../FrontEnd/public/constants.js';
    const constantsFileContent = fs.readFileSync(constantsFilePath, 'utf8');
    const updatedContent = constantsFileContent.replace(/addressLocal: ".*"/, `addressLocal: "${nftCollectionFactory.address}"`);
    fs.writeFileSync(constantsFilePath, updatedContent, 'utf8');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
