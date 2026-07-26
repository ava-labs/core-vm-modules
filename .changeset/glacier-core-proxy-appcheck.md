---
'@avalabs/vm-module-types': major
'@avalabs/evm-module': major
'@avalabs/avalanche-module': major
'@avalabs/bitcoin-module': major
'@avalabs/hvm-module': major
'@avalabs/hypercore-module': major
'@avalabs/svm-module': major
---

Route Glacier calls through core-proxy-api and require per-request auth headers on the EVM and Avalanche modules.

BREAKING: `EvmModule` and `AvalancheModule` now require `runtime.getAuthHeaders` in their constructor params — an async resolver for auth headers (e.g. a Firebase AppCheck token or a Core API key) invoked on every internal Glacier request. Without it those modules cannot function: `glacierApiUrl` now points at `core-proxy-api.avax.network/v1/proxy/glacier` (prod) / `core-proxy-api.avax-test.network/v1/proxy/glacier` (dev), which rejects unauthenticated requests, and the old `glacier-api.avax.network` host is losing its EVM endpoints as part of the Glacier migration.

Also removed the client-side Glacier rate-limit key from the avalanche tx handlers (the proxy injects its own rate-limit bypass upstream; dev builds can supply a Core API key via `getAuthHeaders`) and the unused `glacierApiUrl` from bitcoin-module's env.
