---
'@avalabs/vm-module-types': major
'@avalabs/evm-module': major
'@avalabs/avalanche-module': major
'@avalabs/bitcoin-module': major
---

Route Glacier calls through core-proxy-api and require per-request auth headers on the EVM and Avalanche modules.

BREAKING: `EvmModule` and `AvalancheModule` now require `runtime.getAuthHeaders` in their constructor params — an async resolver for auth headers (e.g. a Firebase AppCheck token) invoked on every internal Glacier request. Without it those modules cannot function: `glacierApiUrl` now points at `core-proxy-api.avax.network/v1/proxy/glacier` (prod) / `core-proxy-api.avax-test.network/v1/proxy/glacier` (dev), which rejects unauthenticated requests, and the old `glacier-api.avax.network` host is losing its EVM endpoints as part of the Glacier migration.

Also removed the unused `glacierApiUrl` from bitcoin-module's env (bitcoin traffic goes through the proxy-api worker, which is unchanged).
