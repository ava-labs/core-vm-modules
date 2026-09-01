---
'@avalabs/avalanche-module': patch
'@avalabs/evm-module': patch
'@avalabs/bitcoin-module': patch
'@avalabs/svm-module': patch
'@avalabs/hvm-module': patch
'@avalabs/hypercore-module': patch
'@avalabs/vm-module-types': patch
---

Bump `@avalabs/avalanchejs` to `5.1.1-alpha.4` and the `@avalabs/*` SDK family to `3.1.0-alpha.97`.

`avalanchejs` `5.1.1-alpha.4` fixes `Utxo#getOutputOwners()` throwing `unable to get output owner` for `nftfx.TransferOutput`, `nftfx.MintOutput` and `secp256k1fx.MintOutput`, all of which do carry `OutputOwners`. Because `getUtxoInfo()` called it before its own fallbacks could run, anything mapping `getUtxoInfo` over a UTXO set threw when the set contained a single NFT — even when the operation had no interest in that UTXO. On X-chain, where `nftfx` outputs are legal, one NFT anywhere in a wallet broke every X-chain operation for that wallet.

`avalanche-module` pinned the affected `avalanchejs` exactly, so consumers could not fix this by bumping their own top-level dependency: they received a nested copy of the broken version through here unless they also carried a resolution override.

The `@avalabs/*` SDKs move from `3.1.0-alpha.96` to `3.1.0-alpha.97` together because those packages are released with locked versioning, and `core-wallets-sdk@3.1.0-alpha.97` pins its siblings at `3.1.0-alpha.97` exactly. Bumping only `core-wallets-sdk` would leave duplicate copies of `core-utils-sdk`, `core-chains-sdk` and `glacier-sdk` in consumers' trees.

`@avalabs/glacier-sdk` in particular must move in lockstep across **every** package that pins it (including the internal `@internal/utils`): its `CancelablePromise` declares a `#private` field, so TypeScript compares copies nominally, and two physically distinct installs are never assignable to each other — a split pin fails the build with `TS2345` on `GlacierFetchHttpRequest` even though the two versions' emitted types are byte-identical.
