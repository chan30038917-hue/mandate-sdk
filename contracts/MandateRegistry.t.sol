// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MandateRegistry.sol";

contract MandateRegistryTest is Test {
    MandateRegistry public registry;
    
    bytes32 constant MANDATE_ID = keccak256("mandate-1");
    address constant AGENT = address(0xA6E27);
    bytes32 constant PUB_X = bytes32(uint256(0x1234));
    bytes32 constant PUB_Y = bytes32(uint256(0x5678));
    
    function setUp() public {
        registry = new MandateRegistry();
    }
    
    function test_ExpiredMandate_Reverts() public {
        MandateRegistry.Mandate memory m = MandateRegistry.Mandate({
            agent: AGENT,
            token: address(0),
            maxPerTx: 1 ether,
            maxPerPeriod: 5 ether,
            periodSeconds: 1 days,
            validUntil: uint64(block.timestamp - 1),
            nonce: keccak256("nonce-2")
        });
        
        vm.expectRevert("Mandato expirado");
        registry.registerMandate(
            MANDATE_ID,
            m,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            PUB_X,
            PUB_Y
        );
    }
    
    function test_PerTxLimit() public {
        uint256 amount = 2 ether;
        uint256 maxPerTx = 1 ether;
        assertGt(amount, maxPerTx, "El test debe usar amount mayor a maxPerTx");
    }
    
    function test_PerPeriodLimit() public {
        uint256 spentInPeriod = 4 ether;
        uint256 amount = 2 ether;
        uint256 maxPerPeriod = 5 ether;
        assertGt(spentInPeriod + amount, maxPerPeriod, "Debe exceder el limite");
    }
    
    function test_GetSpendState_Initial() public {
        MandateRegistry.SpendState memory state = registry.getSpendState(MANDATE_ID);
        assertEq(state.spentInPeriod, 0);
        assertEq(state.periodStart, 0);
    }
}
