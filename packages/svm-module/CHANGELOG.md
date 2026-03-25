# @avalabs/svm-module

## 3.6.0

### Patch Changes

- 281614e: getAddressesByIndices supports internalIndices on P Chain; bump sdks
- Updated dependencies [281614e]
  - @avalabs/vm-module-types@3.6.0

## 3.5.1

### Patch Changes

- ab99fe7: Moralis ERC-20 history: fill missing token symbols (fallback to name, then shortened contract address) and trim blank native symbols so Activity shows a label on Base and other Moralis-backed chains.
- Updated dependencies [ab99fe7]
  - @avalabs/vm-module-types@3.5.1

## 3.5.0

### Minor Changes

- 34fb4c3: The modules use runtime.fetch if available

### Patch Changes

- Updated dependencies [34fb4c3]
  - @avalabs/vm-module-types@3.5.0

## 3.4.0

### Patch Changes

- @avalabs/vm-module-types@3.4.0

## 3.3.1

### Patch Changes

- @avalabs/vm-module-types@3.3.1

## 3.3.0

### Patch Changes

- Updated dependencies [e0878b4]
- Updated dependencies [e0878b4]
  - @avalabs/vm-module-types@3.3.0

## 3.2.0

### Patch Changes

- Updated dependencies [a28c835]
  - @avalabs/vm-module-types@3.2.0

## 3.1.4

### Patch Changes

- efce0b3: fix: format genesis data
- Updated dependencies [efce0b3]
  - @avalabs/vm-module-types@3.1.4

## 3.1.3

### Patch Changes

- @avalabs/vm-module-types@3.1.3

## 3.1.2

### Patch Changes

- @avalabs/vm-module-types@3.1.2

## 3.1.1

### Patch Changes

- 2e0c5f7: changed exponential backoff params to try 10 times at a 500ms increment
- d311fe6: fix(evm-module): filter out spam transactions from history"
- Updated dependencies [2e0c5f7]
- Updated dependencies [d311fe6]
  - @avalabs/vm-module-types@3.1.1

## 3.1.0

### Minor Changes

- 18ad6d5: Add skipIntermediateTxs option to eth_sendTransactionBatch

### Patch Changes

- Updated dependencies [18ad6d5]
  - @avalabs/vm-module-types@3.1.0

## 3.0.7

### Patch Changes

- e29ce69: remove from address param for avalanche_signTransaction
- Updated dependencies [e29ce69]
  - @avalabs/vm-module-types@3.0.7

## 3.0.6

### Patch Changes

- e29ce69: remove from address param for avalanche_signTransaction
- Updated dependencies [e29ce69]
  - @avalabs/vm-module-types@3.0.6

## 3.0.5

### Patch Changes

- 48393c1: Added new body property to Alert type, keeping it backwards compatible
- Updated dependencies [48393c1]
  - @avalabs/vm-module-types@3.0.5

## 3.0.4

### Patch Changes

- 89bac4e: add onlyWaitForLastTx for batch transactions on EVM
- Updated dependencies [89bac4e]
  - @avalabs/vm-module-types@3.0.4

## 3.0.3

### Patch Changes

- @avalabs/vm-module-types@3.0.3

## 3.0.2

### Patch Changes

- e0ca7cc: change tx details order after parsing
- Updated dependencies [e0ca7cc]
  - @avalabs/vm-module-types@3.0.2

## 3.0.1

### Patch Changes

- cf99e2c: return contract address property for tx history items
- Updated dependencies [cf99e2c]
  - @avalabs/vm-module-types@3.0.1

## 3.0.0

### Patch Changes

- @avalabs/vm-module-types@3.0.0

## 2.2.1

### Patch Changes

- @avalabs/vm-module-types@2.2.1

## 2.2.0

### Patch Changes

- @avalabs/vm-module-types@2.2.0

## 2.1.0

### Patch Changes

- Updated dependencies [3a5223f]
  - @avalabs/vm-module-types@2.1.0

## 2.0.1

### Patch Changes

- 332c6f6: bump release
- Updated dependencies [332c6f6]
  - @avalabs/vm-module-types@2.0.1

## 2.0.0

### Patch Changes

- @avalabs/vm-module-types@2.0.0

## 1.11.0

### Patch Changes

- Updated dependencies [f3f11ec]
  - @avalabs/vm-module-types@1.11.0

## 1.10.3

### Patch Changes

- ba3878e: Use prices from the watchlist for native tokens
  - @avalabs/vm-module-types@1.10.3

## 1.10.2

### Patch Changes

- ec6c4ff: Fix X-chain total balance calculation
- Updated dependencies [ec6c4ff]
  - @avalabs/vm-module-types@1.10.2

## 1.10.1

### Patch Changes

- 67e5683: update avalanche sdks to latest
- Updated dependencies [67e5683]
  - @avalabs/vm-module-types@1.10.1

## 1.10.0

### Patch Changes

- cc3811a: feat: support atomic txs on c-chain
- Updated dependencies [cc3811a]
  - @avalabs/vm-module-types@1.10.0

## 1.9.13

### Patch Changes

- fd8e8f5: modified svm module to handle ATA to better track SPL transction Activity
  - @avalabs/vm-module-types@1.9.13

## 1.9.12

### Patch Changes

- @avalabs/vm-module-types@1.9.12

## 1.9.11

### Patch Changes

- 83fbc0c: change solana commitment to confirmed to speed up transaction time
  - @avalabs/vm-module-types@1.9.11

## 1.9.10

### Patch Changes

- @avalabs/vm-module-types@1.9.10

## 1.9.9

### Patch Changes

- 76303a5: Removed fee calculation for svm module
  - @avalabs/vm-module-types@1.9.9

## 1.9.8

### Patch Changes

- 61fe4d5: Solana fee fixes for transfers
  - @avalabs/vm-module-types@1.9.8

## 1.9.7

### Patch Changes

- ccef6b9: modified solana fees to not be calculated for swaps
  - @avalabs/vm-module-types@1.9.7

## 1.9.6

### Patch Changes

- 6712674: bump internal sdks to 3.1.0-alpha.58
- 18ab177: added fee calculation to svm module for sol and spl tokens
- Updated dependencies [6712674]
  - @avalabs/vm-module-types@1.9.6

## 1.9.5

### Patch Changes

- 74bb0e0: changed approval controller types to handle string instead of 0x string
- 74bb0e0: modified ApprovalController types to utilize string instead of 0x strings for txhash
- 74bb0e0: added waiting for a solana tx status, and proper approval controller handling
- Updated dependencies [74bb0e0]
- Updated dependencies [74bb0e0]
  - @avalabs/vm-module-types@1.9.5

## 1.9.4

### Patch Changes

- Updated dependencies [b38bc40]
- Updated dependencies [e5d2d06]
- Updated dependencies [b38bc40]
  - @avalabs/vm-module-types@1.9.4

## 1.9.3

### Patch Changes

- Updated dependencies [f0a0c85]
- Updated dependencies [f0a0c85]
  - @avalabs/vm-module-types@1.9.3

## 1.9.2

### Patch Changes

- @avalabs/vm-module-types@1.9.2

## 1.9.1

### Patch Changes

- eb4328a: adjust display data (title, action, alert) for next gen
- Updated dependencies [eb4328a]
  - @avalabs/vm-module-types@1.9.1

## 1.9.0

### Minor Changes

- 8a98875: Handle Blockaid simulation failures for Solana
- 8a98875: Parse TransferChecked instruction for Solana

### Patch Changes

- @avalabs/vm-module-types@1.9.0

## 1.8.1

### Patch Changes

- @avalabs/vm-module-types@1.8.1

## 1.8.0

### Minor Changes

- a662c53: feat: recognize swap tx for solana

### Patch Changes

- @avalabs/vm-module-types@1.8.0

## 1.7.1

### Patch Changes

- 137237f: fix transaction timestampts
  - @avalabs/vm-module-types@1.7.1

## 1.7.0

### Minor Changes

- 02349f0: simulate transactions with Blockaid

### Patch Changes

- 055816d: Prevent passing transactions to signMessage() calls
  - @avalabs/vm-module-types@1.7.0

## 1.6.2

### Patch Changes

- @avalabs/vm-module-types@1.6.2

## 1.6.1

### Patch Changes

- @avalabs/vm-module-types@1.6.1

## 1.6.0

### Minor Changes

- 7896a19: Solana provider for dApps

### Patch Changes

- Updated dependencies [7896a19]
  - @avalabs/vm-module-types@1.6.0

## 1.5.0

### Minor Changes

- 00f59fe: Solana signing RPC calls
- b4b6652: get Solana transaction history
- 55f2c23: feat: introduce deriveAddress() method

### Patch Changes

- 8acff70: bump internal sdks to 3.1.0-alpha.44
- 1c2d817: feat: adds an empty module for Solana VM
- Updated dependencies [00f59fe]
- Updated dependencies [b4b6652]
- Updated dependencies [8acff70]
- Updated dependencies [1c2d817]
- Updated dependencies [55f2c23]
  - @avalabs/vm-module-types@1.5.0

## 1.4.6

### Patch Changes

- @avalabs/vm-module-types@1.4.6

## 1.4.5

### Patch Changes

- @avalabs/vm-module-types@1.4.5

## 1.4.4

### Patch Changes

- @avalabs/vm-module-types@1.4.4

## 1.4.3

### Patch Changes

- @avalabs/vm-module-types@1.4.3

## 1.4.2

### Patch Changes

- @avalabs/vm-module-types@1.4.2

## 1.4.1

### Patch Changes

- Updated dependencies [0a75fcc]
- Updated dependencies [0a75fcc]
  - @avalabs/vm-module-types@1.4.1

## 1.4.0

### Minor Changes

- 8969b33: Add EIP-2930 support

### Patch Changes

- 0954386: Fix broken lock file
- Updated dependencies [0954386]
- Updated dependencies [8969b33]
  - @avalabs/vm-module-types@1.4.0

## 1.3.0

### Patch Changes

- @avalabs/vm-module-types@1.3.0

## 1.2.1

### Patch Changes

- @avalabs/vm-module-types@1.2.1

## 1.2.0

### Patch Changes

- Updated dependencies [1f54063]
  - @avalabs/vm-module-types@1.2.0

## 1.1.0

### Patch Changes

- 7bee314: feat: adds an empty module for Solana VM
- af15f8d: feat: batch signing for EVM, stable release for all
- Updated dependencies [af15f8d]
- Updated dependencies [7bee314]
- Updated dependencies [af15f8d]
- Updated dependencies [af15f8d]
  - @avalabs/vm-module-types@1.1.0
