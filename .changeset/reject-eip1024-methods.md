---
'@avalabs/evm-module': patch
---

fix: reject `eth_decrypt` and `eth_getEncryptionPublicKey` locally with EIP-1193 4200 (Unsupported Method) instead of forwarding them to the RPC node
