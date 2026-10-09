export { MandateSDK } from "./MandateSDK.js";
export { generatePasskey, signMessage, verifySignature, toBytes32 } from "./passkey.js";
export { MANDATE_REGISTRY_ABI, PAYMENT_GATE_ABI } from "./abis.js";

export const CONTRACTS = {
  monadTestnet: {
    chainId: 10143,
    rpcUrl: "https://testnet-rpc.monad.xyz",
    mandateRegistry: "0xa0fE5E39eA07Fe2FEb94d9Acd9b0dD495E8f5809",
    paymentGate: "0x0a8fa25b9b96F158ddd863f65DdB6CA8b8c6C28a",
  },
};
