---
'@avalabs/evm-module': patch
---

fix: when the Blockaid batch scan fails or returns fewer results than transactions, `eth_sendTransactionBatch` still lists every transaction in the approval (with a warning) and still enforces the gas-limit guard, instead of showing an approval with no signing requests
