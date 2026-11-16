---
'@avalabs/avalanche-module': patch
'@avalabs/evm-module': patch
'@avalabs/bitcoin-module': patch
'@avalabs/svm-module': patch
'@avalabs/hvm-module': patch
'@avalabs/hypercore-module': patch
'@avalabs/vm-module-types': patch
---

fix: poll X-Chain tx acceptance via `avm.getTx` instead of deprecated `avm.getTxStatus`