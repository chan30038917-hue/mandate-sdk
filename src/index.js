export { MandateSDK } from "./MandateSDK.js";
export { generatePasskey, signMessage, verifySignature, toBytes32 } from "./passkey.js";
export { MANDATE_REGISTRY_ABI, PAYMENT_GATE_ABI } from "./abis.js";

export const CONTRACTS = {
  monadMainnet: {
    chainId: 143,
    rpcUrl: "https://rpc.monad.xyz",
    registryAddress: "0x7695Cf7a86d6D08b5283a69c10f94b014D421649",
    gateAddress: "0xc8b31cc4E238905D96AAe66A06Ebc821b4E399aD",
  },
  monadTestnet: {
    chainId: 10143,
    rpcUrl: "https://testnet-rpc.monad.xyz",
    registryAddress: "0xa0fE5E39eA07Fe2FEb94d9Acd9b0dD495E8f5809",
    gateAddress: "0x0a8fa25b9b96F158ddd863f65DdB6CA8b8c6C28a",
  },
};
