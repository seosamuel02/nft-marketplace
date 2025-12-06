// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OceanToken is ERC20 {
    uint256 public constant DROP_AMOUNT = 1000 * 10**18;
    mapping(address => bool) public hasClaimed;

    constructor() ERC20("OceanToken", "OCT") {
        // Initial mint for owner/testing if needed (e.g. 1 million)
        _mint(msg.sender, 1000000 * 10**18); 
    }

    // Function to claim free tokens (Token Drop)
    // User can claim 1000 tokens once (or multiple times? Requirement says 'applicants... automatically send'). 
    // Usually 'drop' implies limited or one-time, but for testing let's allow it or just limit to prevent abuse?
    // User Requirement: "Automatically send to anyone who claims".
    // I'll make it unlimited for ease of testing in this assignment context, or maybe check a mapping.
    // Let's stick to unlimited for debug/demo purposes unless strictly restricted.
    function claimTokens() external {
        _mint(msg.sender, DROP_AMOUNT);
    }
}
