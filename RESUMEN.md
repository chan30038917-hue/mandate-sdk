# RESUMEN DEL PROYECTO — MANDATE SDK

## 1. Nombre y descripcion

Mandate SDK: SDK para mandatos de pago verificables con passkey en Monad.

Permite que agentes autonomos paguen por servicios sin exponer las claves privadas del usuario. El dueno firma un mandato con su passkey que define limites de gasto, y el agente paga solo, dentro de esos limites, con verificacion on-chain.

## 2. Red

- Red: Monad Testnet
- Chain ID: 10143
- RPC: https://testnet-rpc.monad.xyz
- Explorador: https://testnet.monadscan.com

## 3. Contratos desplegados

### MandateRegistry
- Direccion: 0xa0fE5E39eA07Fe2FEb94d9Acd9b0dD495E8f5809
- Funcion: Almacena mandatos firmados con passkey, verifica firmas P-256 con el precompilado 0x0100, valida limites de gasto por transaccion y por periodo.
- Estado: Verificado en MonadScan

### PaymentGate
- Direccion: 0x32C3B6251eDaCa8626217D4C87C82fcB3360F118
- Funcion: Autoriza pagos, verifica el mandato, cobra comision, envia pago neto al destinatario.
- Estado: Verificado en MonadScan

## 4. Modelo economico

- Comision porcentual: 0.5%
- Comision minima: 0.045 MON
- Se aplica el mayor de los dos

## 5. SDK

- Repositorio: https://github.com/chan30038917-hue/mandate-sdk
- Instalacion: npm install github:chan30038917-hue/mandate-sdk
- Lenguaje: JavaScript (ESM)
- Dependencias: ethers, @noble/curves, @noble/hashes

## 6. Funciones del SDK

- registerMandate: Registra un mandato firmado con passkey
- pay: Autoriza un pago verificado
- calculateFee: Calcula la comision
- isMandateActive: Verifica si un mandato esta activo
- getMandate: Consulta datos del mandato
- getSpendState: Consulta cuanto se ha gastado en el periodo

## 7. Tests

- Contratos: 17/17 pasando
- Flujo end-to-end: Funcionando en Monad Testnet
- Passkey P-256: Funcionando con precompilado 0x0100

## 8. Correcciones aplicadas

- [x] minFee por gas limit (0.02 -> 0.045 MON)
- [x] Formato P256 (hash||r||s||pubX||pubY) confirmado
- [x] Comentario sobre block.timestamp
- [x] Test negativo de firma invalida
- [x] README con limitaciones documentadas
- [x] Wallet de tesoreria separada
- [x] Fix de unused-return en PaymentGate.sol

## 9. Pendientes

- [ ] Auditoria formal (Slither o profesional)
- [ ] Migracion a Monad Mainnet (cuando tengas traccion)
- [ ] Primeros integradores

## 10. Riesgos conocidos

- Precompilado P256: confirmado en testnet. Verificar en mainnet antes de migrar.
- Gas en Monad: se cobra por gas limit, no por gas usado
- block.timestamp: manipulable en segundos, irrelevante para periodos de 24h
- Claves privadas: la wallet de deployer estuvo expuesta en chat (solo testnet)

## 11. Proximos pasos

1. Correr Slither para pre-auditoria
2. Aplicar al hackathon Metropolis
3. Buscar integradores en Discord de Monad
4. Migrar a mainnet cuando haya traccion
