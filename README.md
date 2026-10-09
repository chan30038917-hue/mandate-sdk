# Mandate SDK

SDK para mandatos de pago verificables con passkey en Monad.

> **Landing page:** https://mandate-sdk.vercel.app

## Instalacion

```
npm install github:chan30038917-hue/mandate-sdk
```

## Que es esto

Mandate SDK es la **capa de verificacion de limites de gasto** para agentes autonomos en Monad. Permite que el dueno de un agente firme un "mandato" con su passkey (WebAuthn) que define: maximo por transaccion, maximo por periodo, y expiracion. El agente paga solo, dentro de esos limites, con verificacion on-chain.

No es una plataforma. Es una primitiva que cualquier agente puede integrar.

## Contratos desplegados en Monad Mainnet

Estos son contratos inteligentes, no billeteras.

**MandateRegistry** — Almacena los mandatos firmados con passkey y valida los limites de gasto.

Contrato: `0x7695Cf7a86d6D08b5283a69c10f94b014D421649`

https://monadscan.com/address/0x7695Cf7a86d6D08b5283a69c10f94b014D421649

**PaymentGate** — Autoriza los pagos, verifica el mandato, cobra la comision y envia el pago neto.

Contrato: `0xc8b31cc4E238905D96AAe66A06Ebc821b4E399aD`

https://monadscan.com/address/0xc8b31cc4E238905D96AAe66A06Ebc821b4E399aD

## Red

- **Red:** Monad Mainnet
- **Chain ID:** `143`
- **RPC:** `https://rpc.monad.xyz`
- **Explorador:** https://monadscan.com
- **Moneda:** MON

## Caso de uso real: agente que paga APIs

Un agente quiere pagar 0.5 MON por una llamada a una API de precios. El dueno del agente ya no tiene que aprobar cada pago.

```javascript
import { MandateSDK } from "mandate-sdk";

const sdk = new MandateSDK({ privateKey: process.env.PRIVATE_KEY });

// 1. El dueno firma un mandato (una vez)
const { mandateId, passkey } = await sdk.registerMandate({
  maxPerTx: "1",      // maximo 1 MON por transaccion
  maxPerPeriod: "10", // maximo 10 MON por dia
});

// 2. El agente paga la API automaticamente
const result = await sdk.pay({
  mandateId,
  passkey,
  amount: "0.5",
  recipient: "0xAPI...",
});

console.log("Pago exitoso. Comision:", result.fee, "MON");
```

El agente paga solo. El dueno mantiene el control. No hay custodia de fondos.

## Uso rapido

```javascript
import { MandateSDK } from "mandate-sdk";

const sdk = new MandateSDK({ privateKey: process.env.PRIVATE_KEY });

const { mandateId, passkey } = await sdk.registerMandate({
  maxPerTx: "10",
  maxPerPeriod: "100",
});

const result = await sdk.pay({
  mandateId,
  passkey,
  amount: "1.0",
  recipient: "0x...",
});

console.log("Comision:", result.fee, "MON");
```

## API

### new MandateSDK({ privateKey, rpcUrl?, registryAddress?, gateAddress? })

Crea una instancia del SDK.

### sdk.info()

Devuelve informacion de la conexion: chainId, wallet, balance, comision, feeRecipient.

### sdk.registerMandate({ maxPerTx, maxPerPeriod, periodSeconds?, validDays? })

Registra un mandato firmado con passkey. Devuelve { mandateId, passkey, tx, receipt }.

Guarda el passkey en un lugar seguro. Lo necesitas para todos los pagos futuros.

### sdk.pay({ mandateId, passkey, amount, recipient })

Autoriza un pago. Devuelve { tx, receipt, fee, netAmount }.

### sdk.calculateFee(amountMON)

Calcula la comision para un monto dado.

### sdk.isMandateActive(mandateId, passkey)

Verifica si un mandato esta activo.

### sdk.getMandate(mandateId)

Consulta los datos de un mandato.

### sdk.getSpendState(mandateId)

Consulta cuanto se ha gastado en el periodo actual.

## Modelo economico

- Comision porcentual: 0.5% del monto
- Comision minima: 0.03 MON
- Se aplica el mayor de los dos

## Integracion como primitiva

Mandate SDK esta disenado para ser integrado por otras plataformas de agentes. Si ya tienes un agente que paga APIs o servicios, puedes anadir el `PaymentGate` como capa de verificacion de limites sin cambiar tu arquitectura.

El `PaymentGate` es un contrato independiente. Cualquier aplicacion puede llamarlo para verificar que un pago respeta los limites firmados por el dueno.

## Limitaciones conocidas

### Gas en Monad

Monad cobra por gas limit, no por gas usado. El minFee esta configurado para cubrir el peor caso de gas limit con un margen de seguridad.

### Manipulacion de block.timestamp

block.timestamp puede ser ajustado por validadores en una ventana de segundos. Para periodos de 24 horas, esto es irrelevante.

### Precompilado P256

El formato de entrada es msg_hash(32) + r(32) + s(32) + pubkey_x(32) + pubkey_y(32), que es el estandar EIP-7951.

## Proximos pasos

- Integracion opcional con el Reputation Registry de ERC-8004 para verificar la reputacion del destinatario antes de autorizar un pago.
- Mas ejemplos de integracion con agentes MCP y frameworks de agentes.
- Documentacion de casos de uso por tipo de agente (trading, datos, computo).

## Licencia

MIT
