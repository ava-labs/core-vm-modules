---
"@avalabs/evm-module": minor
---

Recognize eERC (Encrypted ERC) transactions by interface and add "Operation" and "Privacy: eERC20" rows to the EVM transaction approval, gated behind a new EVM-module feature toggle.

The EVM module now accepts its own `runtime.features` (e.g. `{ encryptedERCs: boolean }`) via `EvmRuntimeParams`, and exposes `updateRuntimeParams(partial)` to apply later partial updates (nested `features` are merged) since a module is constructed once. Non-eERC approvals and toggle-off behavior are unchanged.
