---
'@avalabs/evm-module': patch
---

fix: reject EIP-712 typed data whose domain chainId does not match the requested network, while accepting domains without a chainId and Hyperliquid's fixed signing domains
