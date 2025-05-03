// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";

contract TipJar {

    event TipReceived(
        address indexed tipper,
        address indexed staffAddress, 
        string staffName,
        string message,
        uint256 amount,
        uint256 timestamp
    );


    address public owner;

    constructor() {
        owner = msg.sender; 
    }

    /**
     * @notice 
     * @param _staffAddress 
     * @param _staffName 
     * @param _message 
     */
    function sendTip(
        address payable _staffAddress, 
        string memory _staffName,
        string memory _message
    ) public payable {
    
        require(msg.value > 0, "Tip amount must be greater than zero");
        require(_staffAddress != address(0), "Invalid staff address");

    
        emit TipReceived(
            msg.sender, 
            _staffAddress,
            _staffName,
            _message,
            msg.value, 
            block.timestamp
        );

    
        (bool success, ) = _staffAddress.call{value: msg.value}("");
        require(success, "ETH transfer failed");

       
    }

    function withdrawAccidentalFunds() public {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
    fallback() external payable {}
}
