---
'@avalabs/evm-module': patch
---

fix: render EIP-712 typed data recursively in the signing approval: nested structs at any depth, arrays of primitives and of structs, and number/boolean/bigint values are shown in full (previously deep values showed "[object Object]" and non-string array items threw)
