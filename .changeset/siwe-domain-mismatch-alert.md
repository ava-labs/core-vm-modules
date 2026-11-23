---
'@avalabs/evm-module': patch
---

fix: warn on `personal_sign` when a Sign-In with Ethereum (EIP-4361) message's domain or URI does not match the requesting dApp origin (`dappInfo.url`), or when the SIWE message is malformed. The DANGER alert is merged with any Blockaid alert instead of replacing it.
