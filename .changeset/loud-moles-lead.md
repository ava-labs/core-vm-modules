---
'@avalabs/avalanche-module': major
'@avalabs/vm-module-types': major
---

avalanche transaction detail improvements

BREAKING: `Transfer.lockedUntil`, `Transfer.stakeableLockedUntil` and `Transfer.stakedUntil` are now `number | 'indefinitely'`. The avalanche module reports `'indefinitely'` for timestamps past the latest date a JS `Date` can represent, so clients must handle it before formatting these values as dates.
