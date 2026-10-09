import { ethers } from "ethers";
import { p256 } from "@noble/curves/nist.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

const RPC_URL = "https://testnet-rpc.monad.xyz";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const MANDATE_REGISTRY = "0xa0fE5E39eA07Fe2FEb94d9Acd9b0dD495E8f5809";
const PAYMENT_GATE = "0x32C3B6251eDaCa8626217D4C87C82fcB3360F118";

const MANDATE_REGISTRY_ABI = [
  "function registerMandate(bytes32 mandateId, tuple(address agent, address token, uint256 maxPerTx, uint256 maxPerPeriod, uint256 periodSeconds, uint64 validUntil, bytes32 nonce) mandate, bytes32 messageHash, bytes32 r, bytes32 s, bytes32 pubX, bytes32 pubY) external",
  "function isMandateActive(bytes32 mandateId, bytes32 pubX, bytes32 pubY) external view returns (bool)",
  "function getMandate(bytes32 mandateId) external view returns (tuple(address agent, address token, uint256 maxPerTx, uint256 maxPerPeriod, uint256 periodSeconds, uint64 validUntil, bytes32 nonce))",
  "function getSpendState(bytes32 mandateId) external view returns (tuple(uint256 spentInPeriod, uint64 periodStart))",
];

const PAYMENT_GATE_ABI = [
  "function authorizePayment(bytes32 mandateId, uint256 amount, address recipient, bytes32 paymentNonce, bytes32 pubX, bytes32 pubY) external payable returns (uint256 fee, uint256 netAmount)",
  "function calculateFee(uint256 amount) external view returns (uint256)",
  "function feeBps() external view returns (uint256)",
  "function minFee() external view returns (uint256)",
  "function feeRecipient() external view returns (address)",
];

function log(msg) {
  console.log(`\n> ${msg}`);
}

function ok(msg) {
  console.log(`  OK ${msg}`);
}

function info(label, value) {
  console.log(`  ${label}: ${value}`);
}

function toBytes32(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return "0x" + clean.padStart(64, "0");
}

async function main() {
  if (!PRIVATE_KEY) {
    console.error("ERROR: Falta PRIVATE_KEY.");
    process.exit(1);
  }

  log("Conectando a Monad Testnet");
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const network = await provider.getNetwork();
  info("Chain ID", network.chainId.toString());
  info("Wallet", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  info("Balance", ethers.formatEther(balance) + " MON");

  const registry = new ethers.Contract(MANDATE_REGISTRY, MANDATE_REGISTRY_ABI, wallet);
  const gate = new ethers.Contract(PAYMENT_GATE, PAYMENT_GATE_ABI, wallet);

  log("Leyendo configuracion del PaymentGate");
  const feeBps = await gate.feeBps();
  const minFee = await gate.minFee();
  const feeRecipient = await gate.feeRecipient();
  info("Comision porcentual", (Number(feeBps) / 100).toString() + "%");
  info("Comision minima", ethers.formatEther(minFee) + " MON");
  info("Fee Recipient", feeRecipient);

  log("Generando passkey P-256 (simula WebAuthn de navegador)");
  const privKey = p256.utils.randomSecretKey();
  const pubKey = p256.getPublicKey(privKey, false);
  const pubX = bytesToHex(pubKey.slice(1, 33));
  const pubY = bytesToHex(pubKey.slice(33, 65));
  info("Passkey pubX", "0x" + pubX);
  info("Passkey pubY", "0x" + pubY);

  log("Construyendo mandato");
  const mandateId = ethers.keccak256(ethers.toUtf8Bytes("mandate-" + Date.now()));

  const mandate = {
    agent: wallet.address,
    token: ethers.ZeroAddress,
    maxPerTx: ethers.parseEther("10.0"),
    maxPerPeriod: ethers.parseEther("100.0"),
    periodSeconds: 86400n,
    validUntil: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
    nonce: ethers.keccak256(ethers.toUtf8Bytes("nonce-" + Date.now())),
  };

  info("Mandate ID", mandateId);
  info("Agent", mandate.agent);
  info("Max per tx", ethers.formatEther(mandate.maxPerTx) + " MON");
  info("Max per period", ethers.formatEther(mandate.maxPerPeriod) + " MON");
  info("Periodo", Number(mandate.periodSeconds) / 86400 + " dias");
  info("Expira", new Date(Number(mandate.validUntil) * 1000).toISOString());

  const encodedMandate = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(address,address,uint256,uint256,uint256,uint64,bytes32)", "bytes32"],
    [
      [
        mandate.agent,
        mandate.token,
        mandate.maxPerTx,
        mandate.maxPerPeriod,
        mandate.periodSeconds,
        mandate.validUntil,
        mandate.nonce,
      ],
      mandateId,
    ]
  );
  const messageHash = ethers.keccak256(encodedMandate);
  info("Message hash", messageHash);

  log("Firmando mandato con passkey P-256");
  const msgHashBytes = hexToBytes(messageHash.slice(2));
  const sigBytes = p256.sign(msgHashBytes, privKey, {
    lowS: true,
    prehash: false,
  });
  const rBytes = sigBytes.slice(0, 32);
  const sBytes = sigBytes.slice(32, 64);
  const r = "0x" + bytesToHex(rBytes);
  const s = "0x" + bytesToHex(sBytes);
  info("Firma r", r);
  info("Firma s", s);

  log("Registrando mandato en MandateRegistry");
  const registerTx = await registry.registerMandate(
    mandateId,
    mandate,
    messageHash,
    r,
    s,
    toBytes32("0x" + pubX),
    toBytes32("0x" + pubY)
  );
  info("Tx hash", registerTx.hash);
  console.log("  Esperando confirmacion...");
  const receipt = await registerTx.wait();
  info("Bloque", receipt.blockNumber);
  info("Gas usado", receipt.gasUsed.toString());
  ok("Mandato registrado");

  log("Verificando que el mandato esta activo");
  const isActive = await registry.isMandateActive(
    mandateId,
    toBytes32("0x" + pubX),
    toBytes32("0x" + pubY)
  );
  if (!isActive) throw new Error("Mandato NO activo");
  ok("Mandato activo en el registry");

  log("Autorizando un pago de 1.0 MON a traves del PaymentGate");
  const paymentAmount = ethers.parseEther("1.0");
  const paymentNonce = ethers.keccak256(ethers.toUtf8Bytes("pay-" + Date.now()));
  const recipient = wallet.address;

  const feeCalculada = await gate.calculateFee(paymentAmount);
  info("Pago total", ethers.formatEther(paymentAmount) + " MON");
  info("Comision aplicada", ethers.formatEther(feeCalculada) + " MON");
  info("Neto al recipient", ethers.formatEther(paymentAmount - feeCalculada) + " MON");

  const paymentTx = await gate.authorizePayment(
    mandateId,
    paymentAmount,
    recipient,
    paymentNonce,
    toBytes32("0x" + pubX),
    toBytes32("0x" + pubY),
    { value: paymentAmount }
  );
  info("Tx hash", paymentTx.hash);
  console.log("  Esperando confirmacion...");
  const payReceipt = await paymentTx.wait();
  info("Bloque", payReceipt.blockNumber);
  info("Gas usado", payReceipt.gasUsed.toString());
  ok("Pago autorizado y comision cobrada");

  log("Estado final del mandato");
  const state = await registry.getSpendState(mandateId);
  info("Gastado en el periodo", ethers.formatEther(state.spentInPeriod) + " MON");
  info("Inicio del periodo", new Date(Number(state.periodStart) * 1000).toISOString());

  log("Probando que el nonce de pago no se puede reusar");
  try {
    await gate.authorizePayment.staticCall(
      mandateId,
      paymentAmount,
      recipient,
      paymentNonce,
      toBytes32("0x" + pubX),
      toBytes32("0x" + pubY),
      { value: paymentAmount }
    );
    console.error("  ERROR: el nonce se pudo reusar");
  } catch (err) {
    ok("Nonce correctamente bloqueado");
  }

  console.log("\n" + "=".repeat(60));
  console.log("  FLUJO END-TO-END COMPLETADO EXITOSAMENTE");
  console.log("=".repeat(60));
  console.log(`  MandateRegistry: ${MANDATE_REGISTRY}`);
  console.log(`  PaymentGate:     ${PAYMENT_GATE}`);
  console.log(`  Mandate ID:      ${mandateId}`);
  console.log(`  Register Tx:     ${registerTx.hash}`);
  console.log(`  Payment Tx:      ${paymentTx.hash}`);
  console.log("=".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("\nERROR:", err.message || err);
  if (err.data) console.error("   data:", err.data);
  if (err.receipt) console.error("   receipt:", err.receipt);
  process.exit(1);
});
