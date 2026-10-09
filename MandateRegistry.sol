// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MandateRegistry
/// @notice Almacena mandatos firmados con passkey que autorizan pagos de agentes
contract MandateRegistry {
    
    address constant P256_PRECOMPILE = 0x0000000000000000000000000000000000000100;
    
    struct Mandate {
        address agent;
        address token;
        uint256 maxPerTx;
        uint256 maxPerPeriod;
        uint256 periodSeconds;
        uint64  validUntil;
        bytes32 nonce;
    }
    
    struct SpendState {
        uint256 spentInPeriod;
        uint64  periodStart;
    }
    
    mapping(bytes32 => Mandate) public mandates;
    mapping(bytes32 => SpendState) public spendState;
    mapping(bytes32 => mapping(bytes32 => bool)) public isActive;
    
    event MandateCreated(
        bytes32 indexed mandateId,
        address indexed agent,
        uint256 maxPerTx,
        uint256 maxPerPeriod
    );
    
    event MandateRevoked(bytes32 indexed mandateId);
    
    function registerMandate(
        bytes32 mandateId,
        Mandate calldata mandate,
        bytes32 messageHash,
        bytes32 r,
        bytes32 s,
        bytes32 pubX,
        bytes32 pubY
    ) external {
        bytes32 passkeyHash = keccak256(abi.encodePacked(pubX, pubY));
        require(!isActive[passkeyHash][mandateId], "Ya activo");
        require(mandate.validUntil > block.timestamp, "Mandato expirado");
        
        bytes memory input = abi.encodePacked(messageHash, r, s, pubX, pubY);
        (bool success, bytes memory result) = P256_PRECOMPILE.staticcall(input);
        require(success && result.length == 32 && uint256(bytes32(result)) == 1, "Firma invalida");
        
        require(
            keccak256(abi.encode(mandate, mandateId)) == messageHash,
            "Hash no coincide"
        );
        
        mandates[mandateId] = mandate;
        spendState[mandateId] = SpendState(0, uint64(block.timestamp));
        isActive[passkeyHash][mandateId] = true;
        
        emit MandateCreated(mandateId, mandate.agent, mandate.maxPerTx, mandate.maxPerPeriod);
    }
    
    function revokeMandate(
        bytes32 mandateId,
        bytes32 messageHash,
        bytes32 r,
        bytes32 s,
        bytes32 pubX,
        bytes32 pubY
    ) external {
        bytes32 passkeyHash = keccak256(abi.encodePacked(pubX, pubY));
        require(isActive[passkeyHash][mandateId], "No activo");
        
        bytes memory input = abi.encodePacked(messageHash, r, s, pubX, pubY);
        (bool success, bytes memory result) = P256_PRECOMPILE.staticcall(input);
        require(success && result.length == 32 && uint256(bytes32(result)) == 1, "Firma invalida");
        
        isActive[passkeyHash][mandateId] = false;
        emit MandateRevoked(mandateId);
    }
    
    function validateSpend(
        bytes32 mandateId,
        uint256 amount,
        address token
    ) external returns (bool) {
        Mandate memory m = mandates[mandateId];
        SpendState storage sp = spendState[mandateId];
        
        require(block.timestamp < m.validUntil, "Mandato expirado");
        require(token == m.token, "Token no permitido");
        require(amount <= m.maxPerTx, "Excede limite por tx");
        
        if (block.timestamp >= sp.periodStart + m.periodSeconds) {
            sp.spentInPeriod = 0;
            sp.periodStart = uint64(block.timestamp);
        }
        
        require(sp.spentInPeriod + amount <= m.maxPerPeriod, "Excede limite por periodo");
        
        sp.spentInPeriod += amount;
        return true;
    }
    
    function isMandateActive(
        bytes32 mandateId,
        bytes32 pubX,
        bytes32 pubY
    ) external view returns (bool) {
        bytes32 passkeyHash = keccak256(abi.encodePacked(pubX, pubY));
        return isActive[passkeyHash][mandateId];
    }
    
    function getMandate(bytes32 mandateId) external view returns (Mandate memory) {
        return mandates[mandateId];
    }
    
    function getSpendState(bytes32 mandateId) external view returns (SpendState memory) {
        return spendState[mandateId];
    }
}
