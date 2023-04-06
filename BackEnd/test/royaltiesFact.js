const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const MyNFT = artifacts.require('MyNFT');
const SetProposer = artifacts.require("SetProposer");
const NFTCollectionFactory = artifacts.require('NFTCollectionFactory');

contract('SetProposer', function(accounts) {
    const owner = accounts[0];
    const proposer1 = accounts[1];
    const proposer2 = accounts[2];
    let setProposer;

    context("Test of setProposer", function(){
        beforeEach(async () => {
            setProposer = await SetProposer.new();
        });
        
        describe("Deployment", () => {
            it("Set the owner as authorized proposer", async () => {
                const isOwnerAuthorized = await setProposer.isAuthorized(owner);
                expect(isOwnerAuthorized).to.be.true;
            });
        });
        
        describe("Adding a proposer", () => {
            it("should allow the owner to add a new proposer", async () => {
                await setProposer.addProposer(proposer1, { from: owner });
                const isProposer1Authorized = await setProposer.isAuthorized(proposer1);
        
                expect(isProposer1Authorized).to.be.true;
            });

            it("should check the ProposerRegistered event", async () => {
                const receipt = await setProposer.addProposer(proposer1, { from: owner });
                expectEvent(receipt, "ProposerRegistered", {voterAddress: proposer1});
            });
            
        
            it("should not allow non-owner to add a new proposer", async () => {
                await expectRevert(setProposer.addProposer(proposer2, { from: proposer1 }),
                "Ownable: caller is not the owner")
            });
        
            it("should not allow adding an already authorized proposer", async () => {
                await setProposer.addProposer(proposer1, { from: owner });

                await expectRevert(setProposer.addProposer(proposer1, { from: owner }),
                "Already authorise")
            });
        });
    });
});
    
contract('NFTCollectionFactory', function(accounts) {
    const owner = accounts[0];
    const proposer = accounts[1];
    const nonProposer = accounts[2];

    context("Test of NFT Factory", function(){
        beforeEach(async function () {
            this.Factory = await NFTCollectionFactory.new({ from: owner });
            await this.Factory.addProposer(proposer, { from: owner });
        });
        
        describe("createNFTCollection from owner or proposer", function () {
            it("should create a new NFT collection from owner and emit NFTCollectionCreated event", async function () {
                const projectName = 'FirstFilm';
                const launcher = 'DApp4MovieTeam';
                const baseURI = 'ipfs://abcdefgHIJKLMNO123456789/';
                const publicPrice = new BN('10000000000000000');
                const maxSupply = new BN('100');
                const numbID = new BN('1');
                const tx = await this.Factory.createNFTCollection(
                    projectName,
                    launcher,
                    baseURI,
                    publicPrice,
                    maxSupply,
                    numbID,
                    { from: owner }
                );
        
                expectEvent(tx, "NFTCollectionCreated", {_ProjectName: projectName, launcher, publicPrice, maxSupply, numbID, });
            });

            it("should create a new NFT collection from proposer and emit NFTCollectionCreated event", async function () {
                const projectName = 'SecondFilm';
                const launcher = 'DApp4MovieTeam2';
                const baseURI = 'ipfs://abcdefgHIJKLMNO1234567890/';
                const publicPrice = new BN('10000000000000000');
                const maxSupply = new BN('100');
                const numbID = new BN('1');
                const tx2 = await this.Factory.createNFTCollection(
                    projectName,
                    launcher,
                    baseURI,
                    publicPrice,
                    maxSupply,
                    numbID,
                    { from: proposer }
                );
        
                expectEvent(tx2, "NFTCollectionCreated", {_ProjectName: projectName, launcher, publicPrice, maxSupply, numbID, });
            });

            it("shouldn't create a NFT collection from a person not authorized ", async function () {
                const projectName = 'SecondFilm';
                const launcher = 'DApp4MovieTeam2';
                const baseURI = 'ipfs://abcdefgHIJKLMNO1234567890/';
                const publicPrice = new BN('10000000000000000');
                const maxSupply = new BN('100');
                const numbID = new BN('1');
                await expectRevert(this.Factory.createNFTCollection(
                    projectName,
                    launcher,
                    baseURI,
                    publicPrice,
                    maxSupply,
                    numbID,
                    {from: nonProposer}), "Not authorise to launch Collection")
            });

        });
    });
        
});


contract('MyNFT', function (accounts) {
    const owner = accounts[0];
    const recipient = accounts[1];
    const other = accounts[2];

    const projectName = 'FirstFilm';
    const launcher = 'DApp4MovieTeam';
    const baseURI = 'ipfs://abcdefgHIJKLMNO123456789/';
    const publicPrice = new BN('10000000000000000');
    const maxSupply = new BN('100');
    const numbID = new BN('1');

    context("Test of MyNFT once initialized by NFT Factory", function(){
        beforeEach(async function () {
            this.factory = await NFTCollectionFactory.new({ from: owner });
            const tx = await this.factory.createNFTCollection(
                projectName,
                launcher,
                baseURI,
                publicPrice,
                maxSupply,
                numbID,
                { from: owner }
            );
            const nftAddress = tx.logs.find(log => log.event === 'NFTCollectionCreated').args._collectionAddress;
            this.myNFT = await MyNFT.at(nftAddress);
        });
    
        it('should have correct metadata before minting', async function () {
            expect(await this.myNFT.publicPrice()).to.be.bignumber.equal(publicPrice);
            expect(await this.myNFT.maxSupply()).to.be.bignumber.equal(maxSupply);
            expect(await this.myNFT.numbID()).to.be.bignumber.equal(numbID);
        });
    
        it('should have the correct metadata after minting', async function () { //It is possible to check the uri only after minting of the ID 
            await this.myNFT.publicMint(new BN('0'), new BN('1'), { from: other, value: publicPrice })
            expect(await this.myNFT.uri(0)).to.equal('ipfs://abcdefgHIJKLMNO123456789/0.json');
        });
    
        it('should allow public minting no matter the amount (for 1 unit)', async function () {
            const tokenId = new BN('0');
            const amount = new BN('1');
            const { logs } = await this.myNFT.publicMint(tokenId, amount, { from: other, value: publicPrice.mul(amount) });
    
            const event = logs[0];
            assert.equal(event.event, 'TransferSingle', 'Event name should be TransferSingle');
            assert.equal(event.args.operator, other, 'Operator should be equal to other');
            assert.equal(event.args.from, '0x0000000000000000000000000000000000000000', 'From should be the zero address');
            assert.equal(event.args.to, other, 'To should be equal to other');
            assert(event.args.id.eq(tokenId), 'Token ID should match the expected value');
            assert(event.args.value.eq(amount), 'Value should match the expected amount');
    
            expect(await this.myNFT.balanceOf(other, tokenId)).to.be.bignumber.equal(amount);
        });
    
        it('should allow public minting (for several mint)', async function () {
            const tokenId = new BN('0');
            const amount = new BN('4');         //4 is random but can we can choose another number
            const { logs } = await this.myNFT.publicMint(tokenId, amount, { from: other, value: publicPrice.mul(amount) });
    
            const event = logs[0];
            assert.equal(event.event, 'TransferSingle', 'Event name should be TransferSingle');
            assert.equal(event.args.operator, other, 'Operator should be equal to other');
            assert.equal(event.args.from, '0x0000000000000000000000000000000000000000', 'From should be the zero address');
            assert.equal(event.args.to, other, 'To should be equal to other');
            assert(event.args.id.eq(tokenId), 'Token ID should match the expected value');
            assert(event.args.value.eq(amount), 'Value should match the expected amount');
    
            expect(await this.myNFT.balanceOf(other, tokenId)).to.be.bignumber.equal(amount);
        });
    
        it('should not allow public minting when paused', async function () {
            await this.myNFT.pause({ from: owner });
            await expectRevert(
            this.myNFT.publicMint(new BN('0'), new BN('1'), { from: recipient, value: publicPrice }),
            'Pausable: paused'
            );
        });
    
        it('should not allow public minting with incorrect price', async function () {
            const randNumb = new BN('5463'); 
            await expectRevert(
            this.myNFT.publicMint(new BN('0'), new BN('1'), { from: recipient, value: publicPrice.sub(randNumb) }), 'Price paid is not good...');
        });

    })

    context('Test of Royalties', function() {

        beforeEach(async function(){
            this.myNFT = await MyNFT.new({ from: owner });
        });

        it('should set royalties correctly', async function() {
            const value = new BN('500'); // 5% royalty
            const tx = await this.myNFT.setRoyalties(recipient, value, { from: owner });

            expectEvent(tx, 'RoyaltiesSet', { royaltyRecipient: recipient, royaltyPercentage: value });
        });

        it('should return correct royalty info', async function() {
            const royaltyPercentage = new BN('500'); // 5% royalty
            await this.myNFT.setRoyalties(recipient, royaltyPercentage, { from: owner });

            const result = await this.myNFT.royaltyInfo();
            expect(result._receiver).to.equal(recipient);
            expect(result._royaltyAmount.toString()).to.equal(royaltyPercentage.toString());
        });

        it('should return correct royalty recipient and value', async function() {
            const royaltyPercentage = new BN('500'); // 5% royalty
            await this.myNFT.setRoyalties(recipient, royaltyPercentage, { from: owner });

            const recipient1 = await this.myNFT.getRoyaltyRecipient(); //recipient1 = recipient
            const value = await this.myNFT.getRoyaltyValue();

            expect(recipient).to.equal(recipient1);
            expect(value.toString()).to.equal(royaltyPercentage.toString());
        });
    });
});