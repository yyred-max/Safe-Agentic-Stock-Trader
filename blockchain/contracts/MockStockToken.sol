// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockStockToken is ERC20 {
    constructor() ERC20("Mock NVDA", "mNVDA") {
        // Mint 1,000,000 mNVDA to the deployer
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }
}
