import { test } from "node:test";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { CONTRACTS } from "../src/index.js";

test("netAmount preserva precisión con muchos decimales", () => {
  const amountWei = ethers.parseEther("1.234567890123456789");
  const feeWei = ethers.parseEther("0.03");
  const netWei = amountWei - feeWei;
  assert.equal(ethers.formatEther(netWei), "1.204567890123456789");
});

test("CONTRACTS usa registryAddress/gateAddress", () => {
  for (const [net, cfg] of Object.entries(CONTRACTS)) {
    assert.ok(cfg.registryAddress, `${net} sin registryAddress`);
    assert.ok(cfg.gateAddress, `${net} sin gateAddress`);
    assert.ok(cfg.rpcUrl, `${net} sin rpcUrl`);
    assert.ok(cfg.chainId, `${net} sin chainId`);
    assert.equal(cfg.mandateRegistry, undefined, `${net} aún tiene mandateRegistry`);
    assert.equal(cfg.paymentGate, undefined, `${net} aún tiene paymentGate`);
  }
});

test("monadMainnet tiene las direcciones de producción", () => {
  assert.equal(
    CONTRACTS.monadMainnet.registryAddress,
    "0x7695Cf7a86d6D08b5283a69c10f94b014D421649"
  );
  assert.equal(
    CONTRACTS.monadMainnet.gateAddress,
    "0xc8b31cc4E238905D96AAe66A06Ebc821b4E399aD"
  );
  assert.equal(CONTRACTS.monadMainnet.chainId, 143);
});

test("monadTestnet tiene las direcciones de testnet", () => {
  assert.equal(
    CONTRACTS.monadTestnet.registryAddress,
    "0xa0fE5E39eA07Fe2FEb94d9Acd9b0dD495E8f5809"
  );
  assert.equal(
    CONTRACTS.monadTestnet.gateAddress,
    "0x0a8fa25b9b96F158ddd863f65DdB6CA8b8c6C28a"
  );
  assert.equal(CONTRACTS.monadTestnet.chainId, 10143);
});
