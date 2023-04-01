// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./MyNFT.sol"; // Import the ERC-1155 contract

contract ERC1155Factory {

    event TokenCreated(string indexed name, address indexed token, uint256 timestamp);

    function createToken(string memory name, string memory uri) public {
        address tokenAddress;
        bytes memory tokenBytecode = type(MyNFT).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(name));

        assembly {
            tokenAddress := create2(0, add(tokenBytecode, 0x20), mload(tokenBytecode), salt)
            if iszero(extcodesize(tokenAddress)) {
                revert(0, 0)
            }
        }

        MyNFT(tokenAddress).initialize(uri);

        emit TokenCreated(name, tokenAddress, block.timestamp);
    }
}


