---
'@avalabs/vm-module-types': minor
'@avalabs/evm-module': minor
'@avalabs/avalanche-module': minor
'@avalabs/bitcoin-module': minor
---

Route Glacier calls through core-proxy-api and support per-request auth headers.

- `glacierApiUrl` now points at `core-proxy-api.avax.network/v1/proxy/glacier` (prod) / `core-proxy-api.avax-test.network/v1/proxy/glacier` (dev). The old `glacier-api.avax.network` host is losing its EVM endpoints as part of the Glacier migration.
- New `RuntimeParams.getAuthHeaders` lets consumers attach auth headers (e.g. a Firebase AppCheck token, required by core-proxy-api) to every internal Glacier request — resolved per request so short-lived tokens stay fresh.
- Removed the unused `glacierApiUrl` from bitcoin-module's env (bitcoin traffic goes through the proxy-api worker, which is unchanged).
