# Mandate SDK

SDK para mandatos de pago verificables con passkey en Monad.

## Instalacion

```
npm install github:chan30038917-hue/mandate-sdk
```

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

## Que es esto

Permite que agentes autonomos paguen por servicios sin exponer las claves privadas del usuario. El dueno firma un mandato con su passkey que define limites de gasto, y el agente paga solo, dentro de esos limites, con verificacion on-chain.

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

## Limitaciones conocidas

### Gas en Monad

Monad cobra por gas limit, no por gas usado. El minFee esta configurado para cubrir el peor caso de gas limit con un margen de seguridad.

### Manipulacion de block.timestamp

block.timestamp puede ser ajustado por validadores en una ventana de segundos. Para periodos de 24 horas, esto es irrelevante.

### Precompilado P256

El formato de entrada es msg_hash(32) + r(32) + s(32) + pubkey_x(32) + pubkey_y(32), que es el estandar EIP-7951.

## Licencia

MIT
