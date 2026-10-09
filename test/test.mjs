import { MandateSDK } from "../src/index.js";

const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!PRIVATE_KEY) {
    console.error("ERROR: export PRIVATE_KEY=0x... primero");
    process.exit(1);
  }

  console.log("\n=== TEST DEL SDK ===\n");

  const sdk = new MandateSDK({ privateKey: PRIVATE_KEY });

  // 1. Info
  console.log("1. Info del SDK:");
  const info = await sdk.info();
  console.log("  ", info);

  // 2. Registrar mandato
  console.log("\n2. Registrando mandato...");
  const { mandateId, passkey, tx: registerTx } = await sdk.registerMandate({
    maxPerTx: "10",
    maxPerPeriod: "100",
  });
  console.log("   Mandate ID:", mandateId);
  console.log("   Tx:", registerTx);

  // 3. Verificar activo
  console.log("\n3. Verificando activo...");
  const isActive = await sdk.isMandateActive(mandateId, passkey);
  console.log("   Activo:", isActive);

  // 4. Consultar datos
  console.log("\n4. Datos del mandato:");
  const mandate = await sdk.getMandate(mandateId);
  console.log("  ", mandate);

  // 5. Calcular comision
  console.log("\n5. Calculando comision para 1.0 MON:");
  const fee = await sdk.calculateFee("1.0");
  console.log("   Comision:", fee, "MON");

  // 6. Hacer un pago
  console.log("\n6. Realizando pago...");
  const result = await sdk.pay({
    mandateId,
    passkey,
    amount: "1.0",
    recipient: sdk.wallet.address,
  });
  console.log("   Tx:", result.tx);
  console.log("   Comision:", result.fee, "MON");
  console.log("   Neto:", result.netAmount, "MON");

  // 7. Estado final
  console.log("\n7. Estado del mandato:");
  const state = await sdk.getSpendState(mandateId);
  console.log("  ", state);

  console.log("\n=== TEST COMPLETADO ===\n");
}

main().catch((err) => {
  console.error("\nERROR:", err.message || err);
  process.exit(1);
});
