const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const BigNumber = require('bignumber.js');
const MyNFT = artifacts.require('MyNFT');
const NFTMarketplace = artifacts.require('NFTMarketplace');
const SetProposer = artifacts.require("SetProposer");
const NFTCollectionFactory = artifacts.require('NFTCollectionFactory');

contract('NFTMarketplace', function (accounts) {
    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const MarketPlaceAddress = accounts[3];
    const royaltyRecipient = accounts[4];
    const tokenId = new BN('1');
    const price = new BN('1000');
    const quantity = new BN('3');
    const royaltyPercentage = new BN('500');
    const royaltyMarketPlace = new BN('50');

    beforeEach(async function () {
        this.nftFactory = await NFTCollectionFactory.new({ from: owner });
        this.myNFT = await MyNFT.new({ from: owner });
        this.setProposer = await SetProposer.new({ from: owner});        
        this.marketplace = await NFTMarketplace.new(this.myNFT.address, { from: owner });

        this.marketplace.teamAddr = MarketPlaceAddress;

        //Creation of a proposer if we need to test collection created by a Proposer
        // await this.Factory.addProposer(proposer, { from: owner });

        // User1 mint with mintBatch some NFTs for testing
        // mintBatch(to, ids, amounts, data);
        await this.myNFT.mintBatch(user1, [tokenId], [quantity], "0x", { from: owner });

        //Set some informations about royalties (recipient = account[4] and percentage = 500 => 5%)
        await this.myNFT.setRoyalties(royaltyRecipient, royaltyPercentage, { from: owner });
    });

    describe('createOffer', function () {
        it('should create an offer', async function () {
            await this.myNFT.setApprovalForAll(this.marketplace.address, true, { from: user1 });
            await this.marketplace.createOffer(tokenId, price, quantity, { from: user1 });

            const offer = await this.marketplace.getOffer(tokenId);
            expect(offer.isForSale).to.equal(true);
            expect(offer.tokenId).to.be.bignumber.equal(tokenId);
            expect(offer.seller).to.equal(user1);
            expect(offer.price).to.be.bignumber.equal(price);
            expect(offer.quantity).to.be.bignumber.equal(quantity);
        });

        it('should emit the Event OfferCreated', async function () {
            await this.myNFT.setApprovalForAll(this.marketplace.address, true, { from: user1 });
            const receipt = await this.marketplace.createOffer(tokenId, price, quantity, { from: user1 });

            expectEvent(receipt, 'OfferCreated', {
                tokenId: tokenId,
                price: price,
                quantity: quantity,
            });
        });

        it('should revert if not the seller', async function () {
            await expectRevert(
                this.marketplace.cancelOffer(tokenId, { from: user2 }),
                'Only the seller can cancel the offer',
            );
        });

        it('should revert if price <= 0 ', async function () {
            const priceee = (BN("0"));
            await this.myNFT.setApprovalForAll(this.marketplace.address, true, { from: user1 });
            await expectRevert(
                this.marketplace.createOffer(tokenId, priceee, quantity, { from: user1 }),
                "Price must be greater than zero",
            );
        });

        it('should revert if quantity <= 0 ', async function () {
            const qty = (BN("0"));
            await this.myNFT.setApprovalForAll(this.marketplace.address, true, { from: user1 });
            await expectRevert(
                this.marketplace.createOffer(tokenId, price, qty, { from: user1 }),
                "Quantity must be greater than zero",
            );
        });
    });

    describe('cancelOffer', function () {
        beforeEach(async function () {
            await this.myNFT.setApprovalForAll(this.marketplace.address, true, { from: user1 });
            await this.marketplace.createOffer(tokenId, price, quantity, { from: user1 });
        });

        it('should cancel an offer', async function () {
            await this.marketplace.cancelOffer(tokenId, { from: user1 });

            const offer = await this.marketplace.getOffer(tokenId);
            expect(offer.isForSale).to.equal(false);
        });
        
        it('should emit the OfferCancelled event', async function () {
            const receipt = await this.marketplace.cancelOffer(tokenId, { from: user1 });

            expectEvent(receipt, 'OfferCancelled', {
                tokenId: tokenId,
            });
        });

        it('should revert if not the seller', async function () {
            await expectRevert(
                this.marketplace.cancelOffer(tokenId, { from: user2 }),
                'Only the seller can cancel the offer',
            );
        });
    });

    describe('buyNFT and check Royalties', function () {
        beforeEach(async function () {
            await this.myNFT.setApprovalForAll(this.marketplace.address, true, { from: user1 });
            await this.marketplace.createOffer(tokenId, price, quantity, { from: user1 });
            // this.marketplace = await NFTMarketplace.new(this.myNFT.address, MarketPlaceAddress, { from: owner });
        });

        it('should buy NFT and pay royalties to collection maker and DApp Team', async function () {
            const buyQuantity = new BN('2');
            const totalPrice = price.mul(buyQuantity);
            const royaltyAmount = totalPrice.mul(royaltyPercentage).div(new BN('10000'));
            const royaltyTeam = totalPrice.mul(royaltyMarketPlace).div(new BN('10000'));
            const sellerRevenue = totalPrice.sub(royaltyAmount).sub(royaltyTeam);
        
            const royaltyRecipientBalanceBefore = await web3.eth.getBalance(royaltyRecipient);
            const sellerBalanceBefore = await web3.eth.getBalance(user1); 
            const teamBalanceBefore = await web3.eth.getBalance(MarketPlaceAddress);
            
            await this.marketplace.buyNFT(tokenId, buyQuantity, { from: user2, value: totalPrice });

            const offer = await this.marketplace.getOffer(tokenId);

            expect(offer.quantity).to.be.bignumber.equal(quantity.sub(buyQuantity));

            const balance = await this.myNFT.balanceOf(user2, tokenId);
            expect(balance).to.be.bignumber.equal(buyQuantity);

            const royaltyRecipientBalanceAfter = await web3.eth.getBalance(royaltyRecipient);
            const sellerBalanceAfter = await web3.eth.getBalance(user1);
            const teamBalanceAfter = await web3.eth.getBalance(MarketPlaceAddress);

            expect(new BN(royaltyRecipientBalanceAfter)).to.be.bignumber.equal(new BN(royaltyRecipientBalanceBefore).add(royaltyAmount));
            expect(new BN(sellerBalanceAfter)).to.be.bignumber.equal(new BN(sellerBalanceBefore).add(sellerRevenue));
            expect(new BN(teamBalanceAfter)).to.be.bignumber.equal(new BN(teamBalanceBefore).add(royaltyTeam));
        });


        it('should emit an event of the sale', async function() {
            const buyQuantity = new BN('2');
            const totalPrice = price.mul(buyQuantity);
        
            expectEvent( await this.marketplace.buyNFT(tokenId, buyQuantity, { from: user2, value: totalPrice }), 'NFTBought', {
                tokenId: tokenId,
                buyer: user2,
                price: totalPrice,
                quantity: buyQuantity,
            });
        })

        it('should revert if the item is not for sale', async function () {
            await this.marketplace.cancelOffer(tokenId, { from: user1 });

            await expectRevert(
                this.marketplace.buyNFT(tokenId, quantity, { from: user2, value: price.mul(quantity) }),
                'Item is not for sale',
            );
        });

        it('should revert if the quantity is invalid', async function () {
            await expectRevert(
                this.marketplace.buyNFT(tokenId, new BN('0'), { from: user2, value: price.mul(quantity) }),
                'Invalid quantity',
            );

            await expectRevert(
                this.marketplace.buyNFT(tokenId, quantity.add(new BN('1')), { from: user2, value: price.mul(quantity.add(new BN('1'))) }),
                'Invalid quantity',
            );
        });

        it('should revert if the payment is insufficient', async function () {
            await expectRevert(
                this.marketplace.buyNFT(tokenId, quantity, { from: user2, value: price.mul(quantity).sub(new BN('1')) }),
                'Insufficient payment',
            );
        });
    });
});