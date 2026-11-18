---
'@avalabs/evm-module': patch
---

fix: reject `eth_sendTransaction` / `eth_sendTransactionBatch` requests whose `from` or `to` address is not hex or has an invalid EIP-55 checksum (all-lowercase and all-uppercase addresses are still accepted)
