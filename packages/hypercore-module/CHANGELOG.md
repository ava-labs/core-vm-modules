# @avalabs/hypercore-module

## 4.0.3

### Patch Changes

- @avalabs/vm-module-types@4.0.3

## 4.0.2

### Patch Changes

- 0ecf7dc: Fix avax balance calculation
- Updated dependencies [0ecf7dc]
  - @avalabs/vm-module-types@4.0.2

## 4.0.1

### Patch Changes

- 6b68f23: Update SDKs
- Updated dependencies [6b68f23]
  - @avalabs/vm-module-types@4.0.1

## 4.0.0

### Major Changes

- bccae50: Route Glacier calls through core-proxy-api and require per-request auth headers on the EVM and Avalanche modules.

  BREAKING: `EvmModule` and `AvalancheModule` now require `runtime.getAuthHeaders` in their constructor params — an async resolver for auth headers (e.g. a Firebase AppCheck token or a Core API key) invoked on every internal Glacier request. Without it those modules cannot function: `glacierApiUrl` now points at `core-proxy-api.avax.network/v1/proxy/glacier` (prod) / `core-proxy-api.avax-test.network/v1/proxy/glacier` (dev), which rejects unauthenticated requests, and the old `glacier-api.avax.network` host is losing its EVM endpoints as part of the Glacier migration.

  Also removed the client-side Glacier rate-limit key from the avalanche tx handlers (the proxy injects its own rate-limit bypass upstream; dev builds can supply a Core API key via `getAuthHeaders`) and the unused `glacierApiUrl` from bitcoin-module's env.

### Patch Changes

- Updated dependencies [bccae50]
  - @avalabs/vm-module-types@4.0.0

## 3.14.0

### Minor Changes

- 03d3516: Add `withdrawable` to clearinghouse schema, `getWithdrawableUsd`, and `HypercoreInfoClient.fetchWithdrawableState` for Hyperliquid withdrawable balance (Fusion / Markr swap parity)

### Patch Changes

- @avalabs/vm-module-types@3.14.0

## 3.13.2

### Patch Changes

- 8d8e8d5: Add RL token as header
- Updated dependencies [8d8e8d5]
  - @avalabs/vm-module-types@3.13.2

## 3.13.1

### Patch Changes

- @avalabs/vm-module-types@3.13.1

## 3.13.0

### Patch Changes

- @avalabs/vm-module-types@3.13.0

## 3.12.1

### Patch Changes

- cf5a3e0: Improved simulation error handling for solana
- Updated dependencies [cf5a3e0]
  - @avalabs/vm-module-types@3.12.1

## 3.12.0

### Minor Changes

- 3278272: Add read-only HyperCore VM module (`hlcore:mainnet`) with `NetworkVMType.HYPERCORE`, `TokenType.HYPERCORE_SPOT`, and balance/history support.

### Patch Changes

- Updated dependencies [3278272]
  - @avalabs/vm-module-types@3.12.0
