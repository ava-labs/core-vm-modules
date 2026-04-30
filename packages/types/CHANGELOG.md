# @avalabs/vm-module-types

## 3.7.3

## 3.7.2

### Patch Changes

- aed1605: Use polygon gas stations

## 3.7.1

## 3.7.0

### Minor Changes

- dd311fe: allow passing custom HTTP headers to RPC calls

## 3.6.2

## 3.6.1

### Patch Changes

- 88175bb: clean start for glacier

## 3.6.0

### Patch Changes

- 281614e: getAddressesByIndices supports internalIndices on P Chain; bump sdks

## 3.5.1

### Patch Changes

- ab99fe7: Moralis ERC-20 history: fill missing token symbols (fallback to name, then shortened contract address) and trim blank native symbols so Activity shows a label on Base and other Moralis-backed chains.

## 3.5.0

### Minor Changes

- 34fb4c3: The modules use runtime.fetch if available

## 3.4.0

## 3.3.1

## 3.3.0

### Minor Changes

- e0878b4: desplay info update for validator and delegator
- e0878b4: desplay info update for validator and delegator

## 3.2.0

### Minor Changes

- a28c835: return token id and logo url in transaction simulation for an item

## 3.1.4

### Patch Changes

- efce0b3: fix: format genesis data

## 3.1.3

## 3.1.2

## 3.1.1

### Patch Changes

- 2e0c5f7: changed exponential backoff params to try 10 times at a 500ms increment
- d311fe6: fix(evm-module): filter out spam transactions from history"

## 3.1.0

### Minor Changes

- 18ad6d5: Add skipIntermediateTxs option to eth_sendTransactionBatch

## 3.0.7

### Patch Changes

- e29ce69: remove from address param for avalanche_signTransaction

## 3.0.6

### Patch Changes

- e29ce69: remove from address param for avalanche_signTransaction

## 3.0.5

### Patch Changes

- 48393c1: Added new body property to Alert type, keeping it backwards compatible

## 3.0.4

### Patch Changes

- 89bac4e: add onlyWaitForLastTx for batch transactions on EVM

## 3.0.3

## 3.0.2

### Patch Changes

- e0ca7cc: change tx details order after parsing

## 3.0.1

### Patch Changes

- cf99e2c: return contract address property for tx history items

## 3.0.0

## 2.2.1

## 2.2.0

## 2.1.0

### Minor Changes

- 3a5223f: update collectibles type

## 2.0.1

### Patch Changes

- 332c6f6: bump release

## 2.0.0

## 1.11.0

### Minor Changes

- f3f11ec: Allow updating gas limit

## 1.10.3

## 1.10.2

### Patch Changes

- ec6c4ff: Fix X-chain total balance calculation

## 1.10.1

### Patch Changes

- 67e5683: update avalanche sdks to latest

## 1.10.0

### Patch Changes

- cc3811a: feat: support atomic txs on c-chain

## 1.9.13

## 1.9.12

## 1.9.11

## 1.9.10

## 1.9.9

## 1.9.8

## 1.9.7

## 1.9.6

### Patch Changes

- 6712674: bump internal sdks to 3.1.0-alpha.58

## 1.9.5

### Patch Changes

- 74bb0e0: changed approval controller types to handle string instead of 0x string
- 74bb0e0: modified ApprovalController types to utilize string instead of 0x strings for txhash

## 1.9.4

### Patch Changes

- b38bc40: remove network as a separate item in display data
- e5d2d06: transaction callbacks: expose request instead of just request id
- b38bc40: adjust evm display data

## 1.9.3

### Patch Changes

- f0a0c85: expose explorer link via onTransactionConfirmed
- f0a0c85: add onTransactionPending callback

## 1.9.2

## 1.9.1

### Patch Changes

- eb4328a: adjust display data (title, action, alert) for next gen

## 1.9.0

## 1.8.1

## 1.8.0

## 1.7.1

## 1.7.0

## 1.6.2

## 1.6.1

## 1.6.0

### Patch Changes

- 7896a19: Solana provider for dApps

## 1.5.0

### Minor Changes

- b4b6652: get Solana transaction history
- 55f2c23: feat: introduce deriveAddress() method

### Patch Changes

- 00f59fe: Solana signing RPC calls
- 8acff70: bump internal sdks to 3.1.0-alpha.44
- 1c2d817: feat: adds an empty module for Solana VM

## 1.4.6

## 1.4.5

## 1.4.4

## 1.4.3

## 1.4.2

## 1.4.1

### Patch Changes

- 0a75fcc: remove devnet logic
- 0a75fcc: upgrade internal sdks

## 1.4.0

### Minor Changes

- 8969b33: Add EIP-2930 support

### Patch Changes

- 0954386: Fix broken lock file

## 1.3.0

## 1.2.1

## 1.2.0

### Minor Changes

- 1f54063: feat: return reputation for ERC20 tokens

## 1.1.0

### Minor Changes

- af15f8d: feat: batch signing for EVM, stable release for all
- af15f8d: feat: eth_sendTransactionBatch

### Patch Changes

- af15f8d: feat: add list of non-restricted methods to the manifests
- 7bee314: feat: adds an empty module for Solana VM

## 0.12.1

### Patch Changes

- 20e096d: chore: update SDKs

## 0.12.0

### Minor Changes

- b504f6f: new networktype

## 0.11.14

## 0.11.13

## 0.11.12

### Patch Changes

- 6c5f7e5: chore: update SDKs and AJS

## 0.11.11

## 0.11.10

### Patch Changes

- b156e27: chore: use devnet

## 0.11.9

## 0.11.8

## 0.11.7

## 0.11.6

## 0.11.5

## 0.11.4

## 0.11.3

## 0.11.2

### Patch Changes

- 70cf899: fix: make _to_ field optional for eth_sendTransaction

## 0.11.1

## 0.11.0

### Minor Changes

- 293b07b: feat: add bitcoin_signTransaction

## 0.10.0

### Minor Changes

- 3114489: feat: allow choosing token types to load balances for

## 0.9.0

### Minor Changes

- beb8f78: Network fee getter and calculation

## 0.8.0

### Minor Changes

- 2512485: feat: provide fee updater when requesting approval

## 0.7.3

### Patch Changes

- 0013947: Convert balancePerType props to bigint

## 0.7.2

## 0.7.1

## 0.7.0

## 0.6.0

### Minor Changes

- 045271a: Load NFTs on EVM

## 0.5.1

## 0.5.0

## 0.4.2

## 0.4.1

### Patch Changes

- 8b7988e: clean up dependencies of types package
- 9754446: bump internal sdks to 3.1.0-alpha.5

## 0.4.0

### Minor Changes

- 04cc519: feat: add LINK tx detail type

## 0.3.1

## 0.3.0

### Minor Changes

- 1047507: adding evm provider with corresponding stuff

## 0.2.0

### Minor Changes

- 1047507: adding evm provider with corresponding stuff

## 0.1.12

### Patch Changes

- 132e988: avalanche_sendTransaction

## 0.1.11

### Patch Changes

- d8dd608: feat: bitcoin_sendTransaction

## 0.1.10

### Patch Changes

- 4d3c33c: Improve balance fetching and error handling

## 0.1.9

## 0.1.8

### Patch Changes

- b3dcd76: adjust signing result type

## 0.1.7

## 0.1.6

### Patch Changes

- 5c3ee5b: Update use of TokenUnit.toDisplay

## 0.1.5

### Patch Changes

- 9cf6498: added avalanche_sendTransaction handler

## 0.1.4

## 0.1.3

### Patch Changes

- 806c131: Replace BN with bigint

## 0.1.2

## 0.1.1

### Patch Changes

- b666331: reference new sdks

## 0.1.0

### Minor Changes

- c5dca36: ci updates, docs updates

## 0.0.23

### Patch Changes

- fbdefd2: Replace BN with bigint

## 0.0.22

## 0.0.21

## 0.0.20

### Patch Changes

- 9bfa82d: Implement balance fetching for BitcoinModule

## 0.0.19

### Patch Changes

- 5af458b: Add getBalances to avalanche-module

## 0.0.18

## 0.0.17

### Patch Changes

- 3590edf: Transaction parsing, validation and simulation for EVM

## 0.0.16

### Patch Changes

- bc48457: add support for all eth_sign methods

## 0.0.15

### Patch Changes

- f536d58: add module functions to evm-module

## 0.0.14

### Patch Changes

- 0593258: add getBalances to evm-module

## 0.0.13

### Patch Changes

- af68c81: Add getTransactionHistory to avalanche module
- d9fa0f5: added getNetworkFee to avalanche module

## 0.0.12

### Patch Changes

- cd97708: fix: build types package
- d0c2cc9: make module interface more consistent
- 7bc6c6e: add eth_sendTransaction handler

## 0.0.11

## 0.0.10

### Patch Changes

- 60f36fa: add getTokens function

## 0.0.9

### Patch Changes

- 6ffa356: add module functions to evm-module

## 0.0.8

### Patch Changes

- d1d080f: test release

## 0.0.7

### Patch Changes

- bb98621: Move types to @avalabs/vm-module-types

## 0.0.6

### Patch Changes

- 1122704: test release

## 0.0.3

### Patch Changes

- 0b0c52e: Move types to @avalabs/vm-module-types

## 0.0.2

### Patch Changes

- 4b7d5e9: Move types from packages-internal/types to packages/types
