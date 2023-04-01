// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol"; //allow to split revenue

contract MyToken is ERC1155, Ownable, ERC1155Burnable, ERC1155Supply, PaymentSplitter {

    uint256 public publicPrice = 0.01 ether;
    uint256 public maxSupply = 300;

    mapping (address => uint) nftPossess;

    constructor(
        address[] memory _payees,
        uint256[] memory _shares
    ) 
        ERC1155("ipfs://QmUeUFVFepPuMMVSjP4DuSc5vMMDruAFWEPvifBbsJvTge/")
        PaymentSplitter(_payees, _shares)
    {}

    //See it the details of addresses 

    function NumberPossess(address addr) public view returns (uint256) {
        return nftPossess[addr];
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    //Supply tracking

    function uri(uint256 _id) public view virtual override returns(string memory) {
        require(exists(_id), "URI: non existant token");
        return string(abi.encodePacked(super.uri(_id), Strings.toString(_id), ".json"));
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

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        public
        onlyOwner
    {
        _mintBatch(to, ids, amounts, data);
    }

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
}