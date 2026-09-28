---
'@avalabs/vm-module-types': minor
'@avalabs/avalanche-module': minor
---

fix: report an unknown status instead of silently dropping C-chain atomic transactions

The C-chain branch of `avalanche_sendTransaction` polled `avax.getAtomicTxStatus`, which the node deprecated in avalanchego v1.15.0 (Helicon), and swallowed the resulting poll-budget exhaustion without calling any callback — leaving consumers stuck on an in-progress state indefinitely.

Acceptance is now read from `avax.getAtomicTx`, where the presence of `blockHeight` is the only acceptance signal exposed, and exhaustion calls the new optional `ApprovalController.onTransactionStatusUnknown` instead of reporting nothing. The callback is optional, so existing consumers keep compiling and see no behaviour change until they implement it.

Note that `getAtomicTx` serves Processing and Dropped transactions identically, so a genuinely dropped C-chain atomic transaction can no longer be reported as reverted; it surfaces as an unknown status once the poll budget runs out.
