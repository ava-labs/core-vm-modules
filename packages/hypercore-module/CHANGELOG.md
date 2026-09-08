# @avalabs/hypercore-module

## 4.0.5

### Patch Changes

- c079206: Report `restakedRewards` on `TokenWithBalancePVM.balancePerType`.

  Rewards compounded into an auto-renewed validator are bonded into that validator's weight and have no UTXO until it exits, so Glacier reports them as a bare nAVAX total on the P-chain balance rather than in any UTXO category. `calculateAvaxTotalBalance` already counts them toward the total, but the amount was not surfaced anywhere a consumer could read it, so a wallet could show the compounded stake in its total while being unable to break it out.

  `convertPChainBalance` cannot route the field through its existing `balanceTypes` loop, which is typed `Record<string, AggregatedAssetAmount[]>`, so it is read directly and set alongside the derived categories.

  The field stays `undefined` rather than `0n` when Glacier omits it. Omission is not the same as zero: the field is dropped entirely on historical queries (`blockTimestamp > 0`), where absence means "unavailable", while a current-balance query for an address with no auto-renewed position returns `"0"`. Collapsing the two would report "nothing compounded" for a validator whose compounded stake simply could not be read.

  Requires `@avalabs/glacier-sdk` at `3.1.0-alpha.97` or later, which is where `PChainBalance.restakedRewards` is typed.

- Updated dependencies [c079206]
  - @avalabs/vm-module-types@4.0.5

## 4.0.4

### Patch Changes

- 4d9f873: Bump `@avalabs/avalanchejs` to `5.1.1-alpha.4` and the `@avalabs/*` SDK family to `3.1.0-alpha.97`.

  `avalanchejs` `5.1.1-alpha.4` fixes `Utxo#getOutputOwners()` throwing `unable to get output owner` for `nftfx.TransferOutput`, `nftfx.MintOutput` and `secp256k1fx.MintOutput`, all of which do carry `OutputOwners`. Because `getUtxoInfo()` called it before its own fallbacks could run, anything mapping `getUtxoInfo` over a UTXO set threw when the set contained a single NFT — even when the operation had no interest in that UTXO. On X-chain, where `nftfx` outputs are legal, one NFT anywhere in a wallet broke every X-chain operation for that wallet.

  `avalanche-module` pinned the affected `avalanchejs` exactly, so consumers could not fix this by bumping their own top-level dependency: they received a nested copy of the broken version through here unless they also carried a resolution override.

  The `@avalabs/*` SDKs move from `3.1.0-alpha.96` to `3.1.0-alpha.97` together because those packages are released with locked versioning, and `core-wallets-sdk@3.1.0-alpha.97` pins its siblings at `3.1.0-alpha.97` exactly. Bumping only `core-wallets-sdk` would leave duplicate copies of `core-utils-sdk`, `core-chains-sdk` and `glacier-sdk` in consumers' trees.

  `@avalabs/glacier-sdk` in particular must move in lockstep across **every** package that pins it (including the internal `@internal/utils`): its `CancelablePromise` declares a `#private` field, so TypeScript compares copies nominally, and two physically distinct installs are never assignable to each other — a split pin fails the build with `TS2345` on `GlacierFetchHttpRequest` even though the two versions' emitted types are byte-identical.

- Updated dependencies [4d9f873]
  - @avalabs/vm-module-types@4.0.4

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
