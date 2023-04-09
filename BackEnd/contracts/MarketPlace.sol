// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./royaltiesFact.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/** 
* @title A MarketPlace Smart Contract to exchange ERC1155 created in the royaltiesFact.sol
* @author Antoine PICOT / github: https://github.com/hehehe84
* @notice NFTMarketplace Smart Contract allow MyNFT template Collections created by 
* NFTCollectionFactory Smart Contract to exchange ERC-1155 NFTs under the MyNFT contract Template.
* For now I only deal with direct sells. I wanted to integrate bid offers but the time was missing 
* to add the element. It will certainly be the subject of a futur update !
*/

contract NFTMarketplace is ERC1155Holder, Ownable, ReentrancyGuard {

    /**
    * @dev Struct of our Offers
    */

    struct Offer {
        bool isForSale;
        uint256 tokenId;
        address seller;
        uint256 price;
        uint256 quantity;
    }

    mapping(uint256 => Offer) private offers;

    MyNFT private _nftContract;

    /**
    * @dev Event to controle offers and actions (qnd also to make sure that royalties are paid)
    */

    event OfferCreated(uint256 indexed tokenId, uint256 price, uint256 quantity);
    event OfferCancelled(uint256 indexed tokenId);
    event NFTBought(uint256 indexed tokenId, address buyer, uint256 price, uint256 quantity);


    /**
    * @dev We need a NFT contract address in order to exchange them.
    * nftContractAddress was define previously
    */

    uint256 public royaltyMarketPlace;
    address public teamAddr;

    constructor(address nftContractAddress) {
        _nftContract = MyNFT(nftContractAddress);
        royaltyMarketPlace = 50;
        // teamAddr = 0xF847be29EA12b6605D8eb18532e3De53B98DA7A6;
        teamAddr = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; //Use in order to test in local and make sure that my tests work 
        //Correspond to : const MarketPlaceAddress = accounts[3] <=in test
    }

    function createOffer(uint256 tokenId, uint256 price, uint256 quantity) external {
        require(price > 0, "Price must be greater than zero");
        require(quantity > 0, "Quantity must be greater than zero");

        offers[tokenId] = Offer(true, tokenId, msg.sender, price, quantity);

        _nftContract.safeTransferFrom(msg.sender, address(this), tokenId, quantity, "");

        emit OfferCreated(tokenId, price, quantity);
    }

    function cancelOffer(uint256 tokenId) external {
        Offer storage offer = offers[tokenId];
        require(offer.seller == msg.sender, "Only the seller can cancel the offer");

        offer.isForSale = false;

        _nftContract.safeTransferFrom(address(this), msg.sender, tokenId, offer.quantity, "");

        emit OfferCancelled(tokenId);
    }

    /**
    * @dev This buyNFT function is problematic cause it's difficult to ensure that we don't have
    * any Reeentrency possible. In order to make sure that no Reentrency are possible, we use 
    * ReentrancyGuard library from Openzeppelin and we avoid external call because we change the
    * value of the balance before the transfer
    */

    function buyNFT(uint256 tokenId, uint256 quantity) external payable nonReentrant {
        Offer storage offer = offers[tokenId];
        require(offer.isForSale, "Item is not for sale");
        require(quantity > 0 && quantity <= offer.quantity, "Invalid quantity");

        uint256 totalPrice = offer.price * quantity;
        require(msg.value >= totalPrice, "Insufficient payment");

        (address royaltyRecipient, uint256 royaltyPercentage) = _nftContract.royaltyInfo();
        /**
        * Royalty amount sent to creator of the collection 
        */
        uint256 royaltyAmount = (totalPrice * royaltyPercentage) / 10000;
        /**
        * Royalty amount sent to the Dapp Team 
        */
        uint256 royaltyTeam = (totalPrice * royaltyMarketPlace) / 10000;
        
        /**
        * @dev Reentrency by External call is protected because we update the quantity before
        * any transfer.
        */
        offer.quantity -= quantity;
        if (offer.quantity == 0) {
            offer.isForSale = false;
        }

        /**
        * Transfer royalty to recipient 
        */
        payable(royaltyRecipient).transfer(royaltyAmount);

        /**
        * Transfer royalty to team DApp 
        */
        payable(teamAddr).transfer(royaltyTeam);

        /**
        * Transfer the rest to the seller
        */
        payable(offer.seller).transfer(totalPrice - royaltyAmount - royaltyTeam);

        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        _nftContract.safeTransferFrom(address(this), msg.sender, tokenId, quantity, "");

        emit NFTBought(tokenId, msg.sender, totalPrice, quantity);
    }

    function getOffer(uint256 tokenId) external view returns (Offer memory) {
        return offers[tokenId];
    }

}