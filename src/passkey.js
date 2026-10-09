import { p256 } from "@noble/curves/nist.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

/**
 * Genera un par de claves P-256 (simula un passkey de navegador).
 * En produccion real, esto se hace con WebAuthn API en el navegador.
 */
export function generatePasskey() {
  const privateKey = p256.utils.randomSecretKey();
  const publicKey = p256.getPublicKey(privateKey, false);
  return {
    privateKey,
    publicKey,
    pubX: bytesToHex(publicKey.slice(1, 33)),
    pubY: bytesToHex(publicKey.slice(33, 65)),
  };
}

/**
 * Firma un hash con una clave privada P-256.
 * Devuelve r y s como hex strings de 32 bytes cada uno.
 */
export function signMessage(messageHashHex, privateKey) {
  const msgHashBytes = hexToBytes(messageHashHex.startsWith("0x") ? messageHashHex.slice(2) : messageHashHex);
  const sigBytes = p256.sign(msgHashBytes, privateKey, {
    lowS: true,
    prehash: false,
  });
  const r = "0x" + bytesToHex(sigBytes.slice(0, 32));
  const s = "0x" + bytesToHex(sigBytes.slice(32, 64));
  return { r, s };
}

/**
 * Verifica una firma P-256 localmente (util para debugging).
 */
export function verifySignature(messageHashHex, signature, publicKey) {
  const msgHashBytes = hexToBytes(messageHashHex.startsWith("0x") ? messageHashHex.slice(2) : messageHashHex);
  return p256.verify(signature, msgHashBytes, publicKey, {
    lowS: true,
    prehash: false,
  });
}

/**
 * Utilidad para padding a 32 bytes (bytes32).
 */
export function toBytes32(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return "0x" + clean.padStart(64, "0");
}
