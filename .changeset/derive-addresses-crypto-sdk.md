---
'@avalabs/avalanche-module': minor
'@avalabs/bitcoin-module': minor
'@avalabs/evm-module': minor
'@avalabs/hvm-module': minor
'@avalabs/svm-module': minor
'@avalabs/vm-module-types': minor
---

feat: add `deriveAddresses` batch interface backed by `@avalabs/crypto-sdk`

Each module now exposes a batch `deriveAddresses(params)` method that
resolves one public key per `accountIndex` via the `ApprovalController` and
encodes addresses through `@avalabs/crypto-sdk`'s per-chain batch encoders
(avalanche / evm / bitcoin / svm). The `hvm-module` keeps interface parity
with local ed25519 + sha256 encoding since crypto-sdk has no HVM encoder
yet. Adds `DeriveAddressesParams` / `DeriveAddressesResponse` types and a
new `deriveAddresses` method on the `Module` interface.
