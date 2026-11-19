---
'@avalabs/vm-module-types': minor
'@avalabs/evm-module': minor
'@avalabs/avalanche-module': minor
'@avalabs/bitcoin-module': minor
'@avalabs/svm-module': minor
---

Add an optional `runtime.getGlacierApiKey` so apps can provide the Glacier rate-limit key at runtime instead of baking `GLACIER_API_KEY` into their builds. The key is now read per request.
