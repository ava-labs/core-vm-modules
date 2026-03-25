---
'@avalabs/evm-module': patch
---

Classify transactions where the user pays native and sends ERC-20 from the wallet in the same tx (CCTP, CCIP, LayerZero-style fees, and similar) as Bridge, and omit that native leg from the aggregated `tokens` list so native-only activity filters match the user-facing token leg. ETH → token → bridge flows without a direct ERC-20 `Transfer` from the user are unchanged.
