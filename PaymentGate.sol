// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMandateRegistry {
    struct Mandate {
        address agent;
        address token;
        uint256 maxPerTx;
        uint256 maxPerPeriod;
        uint256 periodSeconds;
        uint64  validUntil;
        bytes32 nonce;
    }
    
    function validateSpend(bytes32 mandateId, uint256 amount, address token) external returns (bool);
    function isMandateActive(bytes32 mandateId, bytes32 pubX, bytes32 pubY) external view returns (bool);
    function getMandate(bytes32 mandateId) external view returns (Mandate memory);
}

contract PaymentGate {
    
    IMandateRegistry public immutable registry;
    
    address public owner;
    address public feeRecipient;
    uint256 public feeBps;
    uint256 public minFee;
    uint256 public constant MAX_FEE_BPS = 500;
    
    mapping(bytes32 => mapping(bytes32 => bool)) public paymentNonces;
    
    event PaymentAuthorized(
        bytes32 indexed mandateId,
        address indexed agent,
        address indexed recipient,
        uint256 amount,
        uint256 fee
    );
    
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event MinFeeUpdated(uint256 oldMinFee, uint256 newMinFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event OwnershipTransferred(address oldOwner, address newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }
    
    constructor(address _registry, address _feeRecipient, uint256 _feeBps, uint256 _minFee) {
        require(_registry != address(0), "Registry invalido");
        require(_feeRecipient != address(0), "FeeRecipient invalido");
        require(_feeBps <= MAX_FEE_BPS, "Fee excede maximo");
        
        registry = IMandateRegistry(_registry);
        owner = msg.sender;
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
        minFee = _minFee;
    }
    
    function authorizePayment(
        bytes32 mandateId,
        uint256 amount,
        address payable recipient,
        bytes32 paymentNonce,
        bytes32 pubX,
        bytes32 pubY
    ) external payable returns (uint256 fee, uint256 netAmount) {
        require(recipient != address(0), "Recipient invalido");
        require(amount > 0, "Amount debe ser mayor a 0");
        require(!paymentNonces[mandateId][paymentNonce], "Nonce ya usado");
        require(registry.isMandateActive(mandateId, pubX, pubY), "Mandato no activo");
        
        IMandateRegistry.Mandate memory m = registry.getMandate(mandateId);
        require(msg.sender == m.agent, "Solo el agente puede autorizar");
        
        require(registry.validateSpend(mandateId, amount, address(0)), "Spend validation failed");
        
        paymentNonces[mandateId][paymentNonce] = true;
        
        uint256 percentFee = (amount * feeBps) / 10000;
        fee = percentFee > minFee ? percentFee : minFee;
        
        require(fee < amount, "Comision mayor al monto");
        
        netAmount = amount - fee;
        
        require(msg.value >= amount, "MON insuficiente");
        
        (bool okRecipient, ) = recipient.call{value: netAmount}("");
        require(okRecipient, "Fallo envio al recipient");
        
        if (fee > 0) {
            (bool okFee, ) = payable(feeRecipient).call{value: fee}("");
            require(okFee, "Fallo envio de comision");
        }
        
        uint256 excess = msg.value - amount;
        if (excess > 0) {
            (bool okRefund, ) = payable(msg.sender).call{value: excess}("");
            require(okRefund, "Fallo devolucion de exceso");
        }
        
        emit PaymentAuthorized(mandateId, msg.sender, recipient, amount, fee);
    }
    
    function calculateFee(uint256 amount) external view returns (uint256) {
        uint256 percentFee = (amount * feeBps) / 10000;
        return percentFee > minFee ? percentFee : minFee;
    }
    
    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "Fee excede maximo");
        uint256 old = feeBps;
        feeBps = _feeBps;
        emit FeeUpdated(old, _feeBps);
    }
    
    function setMinFee(uint256 _minFee) external onlyOwner {
        uint256 old = minFee;
        minFee = _minFee;
        emit MinFeeUpdated(old, _minFee);
    }
    
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "FeeRecipient invalido");
        address old = feeRecipient;
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(old, _feeRecipient);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Owner invalido");
        address old = owner;
        owner = newOwner;
        emit OwnershipTransferred(old, newOwner);
    }
    
    receive() external payable {}
}
