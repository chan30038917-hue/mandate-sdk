import { ethers } from "ethers";
import { generatePasskey, signMessage, toBytes32 } from "./passkey.js";
import { MANDATE_REGISTRY_ABI, PAYMENT_GATE_ABI } from "./abis.js";

const DEFAULT_RPC = "https://testnet-rpc.monad.xyz";
const DEFAULT_REGISTRY = "0xa0fE5E39eA07Fe2FEb94d9Acd9b0dD495E8f5809";
const DEFAULT_GATE = "0x0a8fa25b9b96F158ddd863f65DdB6CA8b8c6C28a";

/**
 * MandateSDK: SDK para gestionar mandatos de pago verificables con passkey en Monad.
 * 
 * Uso basico:
 *   const sdk = new MandateSDK({ privateKey });
 *   const { mandateId, passkey } = await sdk.registerMandate({ maxPerTx: "10" });
 *   await sdk.pay({ mandateId, amount: "1.0", recipient: "0x..." });
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
    return {
      chainId: network.chainId.toString(),
      wallet: this.wallet.address,
      balance: ethers.formatEther(balance),
      feeBps: Number(feeBps),
      feePercent: (Number(feeBps) / 100).toString() + "%",
      minFee: ethers.formatEther(minFee),
    };
  }

  /**
   * Registra un mandato firmado con un passkey P-256.
   * @param {Object} opts
   * @param {string} opts.maxPerTx - Limite por transaccion en MON (ej "0.1")
   * @param {string} opts.maxPerPeriod - Limite por periodo en MON (ej "1.0")
   * @param {number} opts.periodSeconds - Duracion del periodo en segundos (default 86400)
   * @param {number} opts.validDays - Dias de validez del mandato (default 30)
   * @returns {Object} { mandateId, passkey, tx, receipt }
   */
  async registerMandate({ maxPerTx, maxPerPeriod, periodSeconds = 86400, validDays = 30 }) {
    if (!maxPerTx) throw new Error("maxPerTx es requerido");
    if (!maxPerPeriod) throw new Error("maxPerPeriod es requerido");

    // Generar passkey
    const passkey = generatePasskey();

    // Crear mandate ID unico
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

    // Hash del mandato
    const encodedMandate = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,address,uint256,uint256,uint256,uint64,bytes32)", "bytes32"],
      [[mandate.agent, mandate.token, mandate.maxPerTx, mandate.maxPerPeriod, mandate.periodSeconds, mandate.validUntil, mandate.nonce], mandateId]
    );
    const messageHash = ethers.keccak256(encodedMandate);

    // Firmar
    const { r, s } = signMessage(messageHash, passkey.privateKey);

    // Enviar transaccion
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

  /**
   * Verifica si un mandato esta activo.
   */
  async isMandateActive(mandateId, passkey) {
    return await this.registry.isMandateActive(
      mandateId,
      toBytes32("0x" + passkey.pubX),
      toBytes32("0x" + passkey.pubY)
    );
  }

  /**
   * Consulta los datos de un mandato.
   */
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

  /**
   * Consulta el estado de gasto de un mandato.
   */
  async getSpendState(mandateId) {
    const s = await this.registry.getSpendState(mandateId);
    return {
      spentInPeriod: ethers.formatEther(s.spentInPeriod),
      periodStart: new Date(Number(s.periodStart) * 1000),
    };
  }

  /**
   * Calcula la comision para un monto dado.
   */
  async calculateFee(amountMON) {
    const amount = ethers.parseEther(amountMON);
    const fee = await this.gate.calculateFee(amount);
    return ethers.formatEther(fee);
  }

  /**
   * Autoriza un pago a traves del PaymentGate.
   * @param {Object} opts
   * @param {string} opts.mandateId
   * @param {Object} opts.passkey - El passkey del mandato
   * @param {string} opts.amount - Monto en MON (ej "1.0")
   * @param {string} opts.recipient - Direccion que recibe el pago neto
   * @returns {Object} { tx, receipt, fee, netAmount }
   */
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
