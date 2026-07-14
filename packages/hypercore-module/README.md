# HyperCore Module

Read-only VM module for Hyperliquid **HyperCore** (spot balances, token registry, and activity).

## Identity

| Field             | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| Package           | `@avalabs/hypercore-module`                                                   |
| CAIP-2            | `hlcore:mainnet`                                                              |
| `NetworkVMType`   | `HYPERCORE`                                                                   |
| Numeric `chainId` | `9999` (Core network-list id only; **not** an EVM chain id)                   |
| Addresses         | EIP-55 EVM addresses (same as `addressC`); derivation is keyed as `HYPERCORE` |

HyperEVM (`eip155:999`) is a normal EVM chain and stays on `@avalabs/evm-module`.

## Capabilities

**Implemented:** `getBalances`, `getTokens`, `getTransactionHistory`, `getManifest`, EVM-style `deriveAddress` / `deriveAddresses` / `buildDerivationPath` / `getAddress` (results keyed `HYPERCORE`).

**Unsupported (loud reject / methodNotSupported):** `getProvider`, `getNetworkFee`, `onRpcRequest`. HyperCore has no RPC, gas model, or dApp methods in this module.

## Balances

- USDC is `TokenType.NATIVE` (unit of account at $1).
- Other spot inventory is `TokenType.HYPERCORE_SPOT` (identity is spot `index`; optional `evmContract` when bridged to HyperEVM).
- Perp **collateral** (ex-unrealized PnL) folds into USDC except for `unifiedAccount` mode. Open perp positions are not listed.

## Installation

```sh
pnpm add @avalabs/hypercore-module
```
