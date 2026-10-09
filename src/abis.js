export const MANDATE_REGISTRY_ABI = [
  "function registerMandate(bytes32 mandateId, tuple(address agent, address token, uint256 maxPerTx, uint256 maxPerPeriod, uint256 periodSeconds, uint64 validUntil, bytes32 nonce) mandate, bytes32 messageHash, bytes32 r, bytes32 s, bytes32 pubX, bytes32 pubY) external",
  "function revokeMandate(bytes32 mandateId, bytes32 messageHash, bytes32 r, bytes32 s, bytes32 pubX, bytes32 pubY) external",
  "function isMandateActive(bytes32 mandateId, bytes32 pubX, bytes32 pubY) external view returns (bool)",
  "function getMandate(bytes32 mandateId) external view returns (tuple(address agent, address token, uint256 maxPerTx, uint256 maxPerPeriod, uint256 periodSeconds, uint64 validUntil, bytes32 nonce))",
  "function getSpendState(bytes32 mandateId) external view returns (tuple(uint256 spentInPeriod, uint64 periodStart))",
  "event MandateCreated(bytes32 indexed mandateId, address indexed agent, uint256 maxPerTx, uint256 maxPerPeriod)",
  "event MandateRevoked(bytes32 indexed mandateId)"
];

export const PAYMENT_GATE_ABI = [
  "function authorizePayment(bytes32 mandateId, uint256 amount, address recipient, bytes32 paymentNonce, bytes32 pubX, bytes32 pubY) external payable returns (uint256 fee, uint256 netAmount)",
  "function calculateFee(uint256 amount) external view returns (uint256)",
  "function feeBps() external view returns (uint256)",
  "function minFee() external view returns (uint256)",
  "function feeRecipient() external view returns (address)",
  "function paymentNonces(bytes32 mandateId, bytes32 paymentNonce) external view returns (bool)",
  "event PaymentAuthorized(bytes32 indexed mandateId, address indexed agent, address indexed recipient, uint256 amount, uint256 fee)"
];
