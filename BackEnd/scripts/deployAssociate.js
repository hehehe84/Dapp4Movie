const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const deployer = (await hre.ethers.getSigners())[0];

    const proposer1 = "0x3fdEb5dfb13516476b27D89e5Ae2580cb835CB1b"; //Address of Veronique
    const proposer2 = "0xF3222cD23a5cd225D3A815cBD1842bf8254C5e2b"; //Address of Edouard
    
    console.log("Deploying contracts with the account:", deployer.address);

    // Deployment of NFTCollectionFactory contract
    const NFTCollectionFactory = await hre.ethers.getContractFactory("NFTCollectionFactory");
    const nftCollectionFactory = await NFTCollectionFactory.deploy();
    await nftCollectionFactory.deployed();
    console.log("NFTCollectionFactory deployed to:", nftCollectionFactory.address);
    console.log("");
    //Add Proposers (my associate)
    await nftCollectionFactory.connect(deployer).addProposer(proposer1);
    await nftCollectionFactory.connect(deployer).addProposer(proposer2);
    console.log("Proposers added...");
    console.log("Veronique at :", proposer1);
    console.log("and Edouard at :", proposer2);
    

    // Save the deployed contract address to the constants file
    const constantsFilePath = '../FrontEnd/public/constants.js';
    const constantsFileContent = fs.readFileSync(constantsFilePath, 'utf8');
    const updatedContent = constantsFileContent.replace(/address: ".*"/, `address: "${nftCollectionFactory.address}"`);
    fs.writeFileSync(constantsFilePath, updatedContent, 'utf8');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });