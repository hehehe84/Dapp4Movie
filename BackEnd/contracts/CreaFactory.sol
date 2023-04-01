// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
// import "@openzeppelin/contracts/finance/PaymentSplitter.sol"; //allow to split revenue

contract MyNFT is ERC1155, Ownable, ERC1155Burnable, ERC1155Supply/*, PaymentSplitter*/ {

    // initialize(string calldata _ProjectName, string calldata _launcher, string calldata baseURI, string[] calldata _payees, uint256[] calldata _shares) public {
    // }

    string private _ProjectName;
    string private _launcher;
    string private baseURI;
    uint256 public publicPrice;
    uint256 public maxSupply;

    // uint256 public publicPrice = 0.01 ether;
    // uint256 public maxSupply = 300;

    function initialize(string calldata ProjectName_, string calldata launcher_, string calldata URI, uint256 publicPriceinWei_, uint256 maxSupply_) public {
        _ProjectName = ProjectName_;
        _launcher = launcher_;
        baseURI = URI;
        publicPrice = publicPriceinWei_; // publicPriceinWei => To modify in the front to enter a correct value
        maxSupply = maxSupply_;
    }

    

    mapping (address => uint) nftPossess;

    constructor() ERC1155(baseURI)
        // PaymentSplitter(_payees, _shares)
    {
        transferOwnership(msg.sender);
    }

    function NumberPossess(address addr) public view returns (uint256) {
        return nftPossess[addr];
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function uri(uint256 _id) public view virtual override returns(string memory) {
        require(exists(_id), "URI: non existant token");
        return string(abi.encodePacked(/*super.uri(_id)*/baseURI, Strings.toString(_id), ".json"));
    }


    function publicMint(uint256 id, uint256 amount) public payable {
        require(msg.value == publicPrice * amount, "Price paid is not good...");
        require(totalSupply(id) + amount <= maxSupply, "You cannot mint this quantity"); // < because initial index = 0
        require(id <= 2, "Sorry, it is impossible to mint a NFT with this ID" ); //1 nft => <1,...
        _mint(msg.sender, id, amount, "");
        nftPossess[msg.sender] += amount;
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

contract NFTCollectionFactory {

    event NFTCollectionCreated(string _ProjectName, string launcher, address _collectionAddress, uint256 publicPrice, uint256 maxSupply, uint256 _timestamp);
   
    function createNFTCollection(
        string memory _ProjectName,
        string memory _launcher,
        string memory baseURI,
        uint256 publicPrice,
        uint256 maxSupply/*,
        address[] memory _payees,
        uint256[] memory _shares*/
    ) external returns(address collectionAddress) {
        // bytes memory collectionBytecode = type(MyNFT).creationCode;
        bytes memory collectionBytecode = abi.encodePacked(
            type(MyNFT).creationCode,
            abi.encode(/*_payees, _shares,*/ _ProjectName, _launcher, baseURI, publicPrice, maxSupply)
        );
        bytes32 salt = keccak256(abi.encodePacked(_ProjectName));

        assembly {
            collectionAddress := create2(0, add(collectionBytecode, 0x20), mload(collectionBytecode), salt)
            if iszero(extcodesize(collectionAddress)) {
                revert(0, 0)
            }
        }

        MyNFT nftContract = MyNFT(payable(collectionAddress));
        nftContract.initialize(/*msg.sender,*/ _ProjectName, _launcher, baseURI, publicPrice, maxSupply/*, _payees, _shares*/);
        nftContract.transferOwnership(msg.sender);

        emit NFTCollectionCreated(_ProjectName, _launcher, collectionAddress, publicPrice, maxSupply, block.timestamp);
    }
}