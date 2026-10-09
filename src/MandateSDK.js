import { ethers } from "ethers";
import { generatePasskey, signMessage, toBytes32 } from "./passkey.js";
import { MANDATE_REGISTRY_ABI, PAYMENT_GATE_ABI } from "./abis.js";

const DEFAULT_RPC = "https://testnet-rpc.monad.xyz";
const DEFAULT_REGISTRY = "0xa0fE5E39eA07Fe2FEb94d9Acd9b0dD495E8f5809";
const DEFAULT_GATE = "0x32C3B6251eDaCa8626217D4C87C82fcB3360F118";

/**
 * MandateSDK: SDK para gestionar mandatos de pago verificables con passkey en Monad.
 * 
 * Uso basico:
 *   const sdk = new MandateSDK({ privateKey });
 *   const { mandateId, passkey } = await sdk.registerMandate({ maxPerTx: "10" });
 *   await sdk.pay({ mandateId, passkey, amount: "1.0", recipient: "0x..." });
 */
export class MandateSDK {
  constructor({ privateKey, rpcUrl, registryAddress, gateAddress }) {
    if (!privateKey) throw new Error("privateKey es requerido");
    this.provider = new ethers.JsonRpcProvider(rpcUrl || DEFAULT_RPC);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.registryAddress = registryAddress || DEFAULT_REGISTRY;
    this.gateAddress = gateAddress || DEFAULT_GATE;
    this.registry = new ethers.Contract(this.registryAddress, MANDATE_REGISTRY_ABI, this.wallet);
    this.gate = new ethers.Contract(this.gateAddress, PAYMENT_GATE_ABI, this.wallet);
  }

  /**
   * Devuelve informacion basica de la conexion.
   */
  async info() {
    const network = await this.provider.getNetwork();
    const balance = await this.provider.getBalance(this.wallet.address);
    const feeBps = await this.gate.feeBps();
    const minFee = await this.gate.minFee();
    const feeRecipient = await this.gate.feeRecipient();
    return {
      chainId: network.chainId.toString(),
      wallet: this.wallet.address,
      balance: ethers.formatEther(balance),
      feeBps: Number(feeBps),
      feePercent: (Number(feeBps) / 100).toString() + "%",
      minFee: ethers.formatEther(minFee),
      feeRecipient,
      registry: this.registryAddress,
      gate: this.gateAddress,
    };
  }

  /**
   * Registra un mandato firmado con un passkey P-256.
   */
  async registerMandate({ maxPerTx, maxPerPeriod, periodSeconds = 86400, validDays = 30 }) {
    if (!maxPerTx) throw new Error("maxPerTx es requerido");
    if (!maxPerPeriod) throw new Error("maxPerPeriod es requerido");

    const passkey = generatePasskey();
    const mandateId = ethers.keccak256(ethers.toUtf8Bytes(`mandate-${Date.now()}-${Math.random()}`));

    const mandate = {
      agent: this.wallet.address,
      token: ethers.ZeroAddress,
      maxPerTx: ethers.parseEther(maxPerTx),
      maxPerPeriod: ethers.parseEther(maxPerPeriod),
      periodSeconds: BigInt(periodSeconds),
      validUntil: BigInt(Math.floor(Date.now() / 1000) + 86400 * validDays),
      nonce: ethers.keccak256(ethers.toUtf8Bytes(`nonce-${Date.now()}-${Math.random()}`)),
    };

    const encodedMandate = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,address,uint256,uint256,uint256,uint64,bytes32)", "bytes32"],
      [[mandate.agent, mandate.token, mandate.maxPerTx, mandate.maxPerPeriod, mandate.periodSeconds, mandate.validUntil, mandate.nonce], mandateId]
    );
    const messageHash = ethers.keccak256(encodedMandate);

    const { r, s } = signMessage(messageHash, passkey.privateKey);

    const tx = await this.registry.registerMandate(
      mandateId,
      mandate,
      messageHash,
      r,
      s,
      toBytes32("0x" + passkey.pubX),
      toBytes32("0x" + passkey.pubY)
    );
    const receipt = await tx.wait();

    return {
      mandateId,
      passkey,
      mandate,
      tx: tx.hash,
      receipt,
    };
  }

  async isMandateActive(mandateId, passkey) {
    return await this.registry.isMandateActive(
      mandateId,
      toBytes32("0x" + passkey.pubX),
      toBytes32("0x" + passkey.pubY)
    );
  }

  async getMandate(mandateId) {
    const m = await this.registry.getMandate(mandateId);
    return {
      agent: m.agent,
      token: m.token,
      maxPerTx: ethers.formatEther(m.maxPerTx),
      maxPerPeriod: ethers.formatEther(m.maxPerPeriod),
      periodSeconds: Number(m.periodSeconds),
      validUntil: new Date(Number(m.validUntil) * 1000),
      nonce: m.nonce,
    };
  }

  async getSpendState(mandateId) {
    const s = await this.registry.getSpendState(mandateId);
    return {
      spentInPeriod: ethers.formatEther(s.spentInPeriod),
      periodStart: new Date(Number(s.periodStart) * 1000),
    };
  }

  async calculateFee(amountMON) {
    const amount = ethers.parseEther(amountMON);
    const fee = await this.gate.calculateFee(amount);
    return ethers.formatEther(fee);
  }

  async pay({ mandateId, passkey, amount, recipient }) {
    if (!mandateId) throw new Error("mandateId es requerido");
    if (!passkey) throw new Error("passkey es requerido");
    if (!amount) throw new Error("amount es requerido");
    if (!recipient) throw new Error("recipient es requerido");

    const amountWei = ethers.parseEther(amount);
    const paymentNonce = ethers.keccak256(ethers.toUtf8Bytes(`pay-${Date.now()}-${Math.random()}`));

    const tx = await this.gate.authorizePayment(
      mandateId,
      amountWei,
      recipient,
      paymentNonce,
      toBytes32("0x" + passkey.pubX),
      toBytes32("0x" + passkey.pubY),
      { value: amountWei }
    );
    const receipt = await tx.wait();

    const fee = await this.calculateFee(amount);
    const netAmount = (Number(amount) - Number(fee)).toString();

    return {
      tx: tx.hash,
      receipt,
      fee,
      netAmount,
      paymentNonce,
    };
  }
}
