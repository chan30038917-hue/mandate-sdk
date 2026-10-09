// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PaymentGate.sol";

contract PaymentGateTest is Test {
    PaymentGate public gate;
    address public registryAddr = address(0x1111111111111111111111111111111111111111);
    address public feeRecipient = address(0x2222222222222222222222222222222222222222);
    address public owner = address(this);
    
    function setUp() public {
        gate = new PaymentGate(registryAddr, feeRecipient, 50, 0.02 ether);
        vm.deal(address(this), 100 ether);
    }
    
    function test_Constructor_SetsValues() public {
        assertEq(address(gate.registry()), registryAddr);
        assertEq(gate.feeRecipient(), feeRecipient);
        assertEq(gate.feeBps(), 50);
        assertEq(gate.minFee(), 0.02 ether);
        assertEq(gate.owner(), owner);
    }
    
    function test_Constructor_RevertsOnInvalidRegistry() public {
        vm.expectRevert("Registry invalido");
        new PaymentGate(address(0), feeRecipient, 50, 0.02 ether);
    }
    
    function test_Constructor_RevertsOnInvalidFeeRecipient() public {
        vm.expectRevert("FeeRecipient invalido");
        new PaymentGate(registryAddr, address(0), 50, 0.02 ether);
    }
    
    function test_Constructor_RevertsOnExcessiveFee() public {
        vm.expectRevert("Fee excede maximo");
        new PaymentGate(registryAddr, feeRecipient, 501, 0.02 ether);
    }
    
    function test_CalculateFee_UseMinimum() public {
        uint256 fee = gate.calculateFee(0.1 ether);
        assertEq(fee, 0.02 ether);
    }
    
    function test_CalculateFee_UsePercentage() public {
        uint256 fee = gate.calculateFee(100 ether);
        assertEq(fee, 0.5 ether);
    }
    
    function test_SetFeeBps() public {
        gate.setFeeBps(100);
        assertEq(gate.feeBps(), 100);
        
        vm.expectRevert("Fee excede maximo");
        gate.setFeeBps(501);
    }
    
    function test_SetFeeBps_OnlyOwner() public {
        vm.prank(address(0xBAD));
        vm.expectRevert("Solo owner");
        gate.setFeeBps(100);
    }
    
    function test_SetMinFee() public {
        gate.setMinFee(0.05 ether);
        assertEq(gate.minFee(), 0.05 ether);
    }
    
    function test_SetMinFee_OnlyOwner() public {
        vm.prank(address(0xBAD));
        vm.expectRevert("Solo owner");
        gate.setMinFee(0.05 ether);
    }
    
    function test_SetFeeRecipient() public {
        address newRecipient = address(0x3333333333333333333333333333333333333333);
        gate.setFeeRecipient(newRecipient);
        assertEq(gate.feeRecipient(), newRecipient);
        
        vm.expectRevert("FeeRecipient invalido");
        gate.setFeeRecipient(address(0));
    }
    
    function test_TransferOwnership() public {
        address newOwner = address(0x4444444444444444444444444444444444444444);
        
        vm.expectRevert("Owner invalido");
        gate.transferOwnership(address(0));
        
        gate.transferOwnership(newOwner);
        assertEq(gate.owner(), newOwner);
    }
    
    function test_Receive() public {
        (bool ok, ) = address(gate).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(address(gate).balance, 1 ether);
    }
}
