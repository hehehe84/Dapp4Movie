// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/** 
* @title Royalties ERC1155-factory secured and optimized Smart Contract
* @author Antoine PICOT / github: https://github.com/hehehe84
* @notice NFTCollectionFactory Smart Contract allow registered Proposers
* to add as many ERC1155 under the template "MyNFT" on the DApp4Movies application 
* ERC2981Base and SetProposer Smart Contracts are here to help us initialize Royalties
* and to determine who has the right to interact with the NFTCollectionFactory Smart Contract
* This project is the final one of my formation in Alyra (Blockchain Development School)
*/

interface IERC2981Royalties {
    /**
    * @notice We are importing royaltyInfo() from IERC2981Royalties to help the Owner to set Royalties on MyNFT contract.
    */
    function royaltyInfo() external view returns (address _receiver, uint256 _royaltyAmount);
}

abstract contract ERC2981Base is Ownable, ERC165, IERC2981Royalties {

    /**
    * @notice abstract contract cause used only to define royalties in MyNFT template. 
    */

    event RoyaltiesSet(address royaltyRecipient, uint24 royaltyPercentage, uint256 _timestamp);
    
    function setRoyalties(address recipient, uint24 value) public onlyOwner {
        require(value <= 10000, "ERC2981Royalties: Too high");
        _royalties = RoyaltyInfo(recipient, value);
        emit RoyaltiesSet(recipient, value, block.timestamp);
    }

    struct RoyaltyInfo {
        address recipient;
        uint24 amount;
    }

    RoyaltyInfo internal _royalties;
    
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC2981Royalties).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
    * @dev the 2 following function are important to get the royalties in the MarketPlace
    * Smart contract.
    */

    function getRoyaltyRecipient() external view returns (address) {
        return _royalties.recipient;
    }

    function getRoyaltyValue() external view returns (uint24) {
        return _royalties.amount;
    }
}

/**
* @notice MyNFT is the template deployed thanks to our NFTCollectionFactory.
* @dev thanks to it's abstraction and the address of a certain collection. We can interact
* with it in the Marketplace.
*/

contract MyNFT is ERC1155, ERC1155Burnable, ERC1155Supply, Pausable, ERC2981Base {

    string private _ProjectName;
    string private _launcher;
    string private baseURI;
    uint256 public publicPrice;
    uint256 public maxSupply;
    uint256 public numbID;
    bool public initialized = false;

    /**
    * @dev thanks to those variable, we are able to deploy a NFT collection (in the factory)
    * But we are also able to use this contract on it's own.
    * Please, take into account that the boolean "initialized" avoid us to re-initialize the collection once it's
    * deployed.
    */

    /**
    * @dev Add of Transfer event to have an update of the number of NFT in the
    * collection
    */
    event Transfer(uint256 quantity, address buyer);

    function initialize(
        string calldata ProjectName_, 
        string calldata launcher_, 
        string calldata URI, 
        uint256 publicPriceinWei_, 
        uint256 maxSupply_, 
        uint256 numbID_
        ) 
    public onlyOwner{
            require (initialized == false, "Collection already initialized");
            _ProjectName = ProjectName_;
            _launcher = launcher_;
            baseURI = URI;
            publicPrice = publicPriceinWei_; // publicPriceinWei => To modify in the front to enter a correct value
            maxSupply = maxSupply_;
            numbID = numbID_;
            initialized = true;
    }

    constructor() ERC1155(baseURI)
    {}

    /**
    * @dev Those 2 functions are here to add security. The Owner of the collection can pause the Mint.
    */

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    /**
    * @dev Functionality added after understanding the help of it in my frontEnd
    */

    function viewURI() public view returns(string memory) {
        return baseURI;
    }

    /**
    * @dev We are able to use the function royaltyInfo() from ERC2981Base contract 
    * Here, we are overriding this function.
    */

    function royaltyInfo()
    external
    view
    override
    returns (address _receiver, uint256 _royaltyAmount)
    {
        _receiver = _royalties.recipient;
        _royaltyAmount = _royalties.amount;
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC2981Base) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
    * @dev the uri functions help us to integrate ids of a hash function
    * in order to set URIs and to have access to the metaDatas of the NFTs
    */

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function uri(uint256 _id) public view virtual override returns(string memory) {
        require(exists(_id), "URI: non existant token");
        return string(abi.encodePacked(baseURI, Strings.toString(_id), ".json"));
    }

    /**
    * @notice the publicMint function is the most important in the contract. It allow the creator of the collection
    * to collect the fund and to the public to mint the NFTs
    */

    function publicMint(uint256 id, uint256 amount) public payable whenNotPaused{
        require(msg.value == publicPrice * amount, "Price paid is not good...");
        require(totalSupply(id) + amount <= maxSupply, "You cannot mint this quantity"); // < because initial index = 0
        require(id < numbID, "Sorry, it is impossible to mint a NFT with this ID" ); //1 nft => <1,...
        _mint(msg.sender, id, amount, "");
        emit Transfer(amount, msg.sender);
    }

    /**
    * @dev the withdraw function is protected against reentrency because :
    * Function is external => we cannot call it with othr function inside the contract.
    * The fund are only called by the Owner
    * We use a tampon variable to re-init the balance and after we can withdraw.
    */

    function withdraw(address _addr) external onlyOwner {
        uint256 balance = address(this).balance;
        payable(_addr).transfer(balance);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) internal override(ERC1155, ERC1155Supply)
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

}

/**
* @notice The following contract is defining who can create a contract thanks to the
* NFTCollection factory that follows it.
* @dev This is a security measure. We do this in order to avoid to have multiple project
* that are not serious => Allow us to avoid Scam.
*/

contract SetProposer is Ownable {
    event ProposerRegistered(address voterAddress); 
    
    mapping (address => bool) public isAuthorized;

    /**
    * @dev The developer is already include in this ProposerList (for practicity).
    */

    constructor(){
        isAuthorized[owner()] = true;
    }

    function addProposer(address _addr) external onlyOwner {
        require(isAuthorized[_addr] != true, 'Already authorise');
    
        isAuthorized[_addr] = true;
        emit ProposerRegistered(_addr);
    }
}

/**
* @notice The following contract is the core of our application
* it allow us to create an ERC1155 NFT with the template "MyNFT" defined previously
*/

contract NFTCollectionFactory is SetProposer {

    /** 
    * @dev event that will allow us to have all the information that we need in our MyNFT to edit royalties, mint and
    * interact on a front-end page
    */
    event NFTCollectionCreated(string _ProjectName, string launcher, address _collectionAddress, uint256 publicPrice, uint256 maxSupply, uint256 numbID, uint256 _timestamp);

    /** 
    * @dev require(isAuthorized[msg.sender], "") check if caller is authorised to deploy a collection
    * _ProjectName,...,numbID = template used to create a MyNFT ERC1155
    * @notice By default, we recommand to upload 1 NFT => numbID = 1
    */

    function createNFTCollection(
        string memory _ProjectName,
        string memory _launcher,
        string memory baseURI, 
        uint256 publicPrice,
        uint256 maxSupply,
        uint256 numbID
    ) external returns(address collectionAddress) {
        require(isAuthorized[msg.sender], "Not authorise to launch Collection");
        bytes memory collectionBytecode = abi.encodePacked(
            type(MyNFT).creationCode,
            abi.encode(_ProjectName, _launcher, baseURI, publicPrice, maxSupply, numbID)
        );
        bytes32 salt = keccak256(abi.encodePacked(_ProjectName));
        assembly {
            collectionAddress := create2(0, add(collectionBytecode, 0x20), mload(collectionBytecode), salt)
            if iszero(extcodesize(collectionAddress)) {
                revert(0, 0)
            }
        }

        MyNFT nftContract = MyNFT(payable(collectionAddress));
        nftContract.initialize(_ProjectName, _launcher, baseURI, publicPrice, maxSupply, numbID);
        nftContract.transferOwnership(msg.sender);
        emit NFTCollectionCreated(_ProjectName, _launcher, collectionAddress, publicPrice, maxSupply, numbID, block.timestamp);
    }
    /** 
    * @dev using assembly is a choice to fit with a wish from Cyril, my teacher.
    * I wanted to pay a small tribute.
    */
}