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


interface IERC2981Royalties {
    function royaltyInfo() external view returns (address _receiver, uint256 _royaltyAmount);
}

abstract contract ERC2981Base is Ownable, ERC165, IERC2981Royalties {

    event RoyaltiesSet(address royaltyRecipient, uint24 royaltyPercentage, uint256 _timestamp);
    
    function setRoyalties(address recipient, uint24 value) external onlyOwner {
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

    function getRoyaltyRecipient() external view returns (address) {
        return _royalties.recipient;
    }

    function getRoyaltyValue() external view returns (uint24) {
        return _royalties.amount;
    }
}

contract MyNFT is ERC1155, ERC1155Burnable, ERC1155Supply, Pausable, ERC2981Base {

    string private _ProjectName;
    string private _launcher;
    string private baseURI;
    uint256 public publicPrice;
    uint256 public maxSupply;
    uint256 public numbID;
    bool public initialized = false;

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

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

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

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function uri(uint256 _id) public view virtual override returns(string memory) {
        require(exists(_id), "URI: non existant token");
        return string(abi.encodePacked(baseURI, Strings.toString(_id), ".json"));
    }


    function publicMint(uint256 id, uint256 amount) public payable whenNotPaused{
        require(msg.value == publicPrice * amount, "Price paid is not good...");
        require(totalSupply(id) + amount <= maxSupply, "You cannot mint this quantity"); // < because initial index = 0
        require(id < numbID, "Sorry, it is impossible to mint a NFT with this ID" ); //1 nft => <1,...
        _mint(msg.sender, id, amount, "");
    }

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

contract SetProposer is Ownable {
    event ProposerRegistered(address voterAddress); 
    
    mapping (address => bool) public isAuthorized;
    constructor(){
        isAuthorized[owner()] = true;
    }

    function addProposer(address _addr) external onlyOwner {
        require(isAuthorized[_addr] != true, 'Already authorise');
    
        isAuthorized[_addr] = true;
        emit ProposerRegistered(_addr);
    }
}

contract NFTCollectionFactory is SetProposer {

    event NFTCollectionCreated(string _ProjectName, string launcher, address _collectionAddress, uint256 publicPrice, uint256 maxSupply, uint256 numbID, uint256 _timestamp);

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
}