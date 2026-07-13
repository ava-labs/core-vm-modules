---
'@avalabs/evm-module': minor
'@avalabs/vm-module-types': minor
---

Add optional `customTokensOnly` flag to `getBalances`. When set, the EVM module fetches balances only for the provided custom tokens, querying them directly via RPC so real on-chain balances are returned even when an indexed provider doesn't cover them.
