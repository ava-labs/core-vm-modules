---
'@avalabs/evm-module': patch
---

fix: show the spender and amount of an ERC-20 `approve` even when Blockaid simulation succeeds without reporting an approval (re-approving an equal or lower amount, or revoking), by decoding the calldata
