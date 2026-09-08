---
'@avalabs/avalanche-module': patch
'@avalabs/evm-module': patch
'@avalabs/bitcoin-module': patch
'@avalabs/svm-module': patch
'@avalabs/hvm-module': patch
'@avalabs/hypercore-module': patch
'@avalabs/vm-module-types': patch
---

Report `restakedRewards` on `TokenWithBalancePVM.balancePerType`.

Rewards compounded into an auto-renewed validator are bonded into that validator's weight and have no UTXO until it exits, so Glacier reports them as a bare nAVAX total on the P-chain balance rather than in any UTXO category. `calculateAvaxTotalBalance` already counts them toward the total, but the amount was not surfaced anywhere a consumer could read it, so a wallet could show the compounded stake in its total while being unable to break it out.

`convertPChainBalance` cannot route the field through its existing `balanceTypes` loop, which is typed `Record<string, AggregatedAssetAmount[]>`, so it is read directly and set alongside the derived categories.

The field stays `undefined` rather than `0n` when Glacier omits it. Omission is not the same as zero: the field is dropped entirely on historical queries (`blockTimestamp > 0`), where absence means "unavailable", while a current-balance query for an address with no auto-renewed position returns `"0"`. Collapsing the two would report "nothing compounded" for a validator whose compounded stake simply could not be read.

Requires `@avalabs/glacier-sdk` at `3.1.0-alpha.97` or later, which is where `PChainBalance.restakedRewards` is typed.
