// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./royaltiesFact.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ERC1155Holder, Ownable {


    struct Offer {
        bool isForSale;
        uint256 tokenId;
        address seller;
        uint256 price;
        uint256 quantity;
    }

    mapping(uint256 => Offer) private offers;

    MyNFT private _nftContract;

    
    //Events :

    event OfferCreated(uint256 indexed tokenId, uint256 price, uint256 quantity);
    event OfferCancelled(uint256 indexed tokenId);
    event NFTBought(uint256 indexed tokenId, address buyer, uint256 price, uint256 quantity);

    constructor(address nftContractAddress) {
        _nftContract = MyNFT(nftContractAddress);
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

    function buyNFT(uint256 tokenId, uint256 quantity) external payable {
        Offer storage offer = offers[tokenId];
        require(offer.isForSale, "Item is not for sale");
        require(quantity > 0 && quantity <= offer.quantity, "Invalid quantity");

        uint256 totalPrice = offer.price * quantity;
        require(msg.value >= totalPrice, "Insufficient payment");

        //Royalties
        (address royaltyRecipient, uint256 royaltyPercentage) = _nftContract.royaltyInfo();
        //Royalty amount
        uint256 royaltyAmount = (totalPrice * royaltyPercentage) / 10000;
        //Transfer royalty to recipient 
        payable(royaltyRecipient).transfer(royaltyAmount);
        //Transfer the rest to the seller
        payable(offer.seller).transfer(totalPrice - royaltyAmount);

        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        _nftContract.safeTransferFrom(address(this), msg.sender, tokenId, quantity, "");

        offer.quantity -= quantity;

        if (offer.quantity == 0) {
            offer.isForSale = false;
        }

        emit NFTBought(tokenId, msg.sender, totalPrice, quantity);
    }

    function getOffer(uint256 tokenId) external view returns (Offer memory) {
        return offers[tokenId];
    }

}