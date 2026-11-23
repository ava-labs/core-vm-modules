---
'@avalabs/vm-module-types': minor
'@avalabs/evm-module': minor
'@avalabs/avalanche-module': minor
'@avalabs/bitcoin-module': minor
'@avalabs/svm-module': minor
---

EVM RPC providers now send `runtime.getAuthHeaders` on every request to Core's proxy (`core-proxy-api.avax.network` / `core-proxy-api.avax-test.network`), and never to other RPC hosts.

Removed the build-time `GLACIER_API_KEY`. Glacier traffic goes through core-proxy-api, which authenticates with `getAuthHeaders` and applies its own rate-limit bypass, so the client-side `rltoken`/`token` parameters on Glacier, EVM, Solana and Bitcoin requests no longer did anything.
