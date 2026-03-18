---
'@avalabs/evm-module': patch
---

Fix Ethereum swap transactions not showing as swaps in Activity tab. Merge normal and ERC20 transactions with the same hash into a single SWAP transaction with both tokens, and populate from/to addresses on all TxTokens for proper swap rendering.
