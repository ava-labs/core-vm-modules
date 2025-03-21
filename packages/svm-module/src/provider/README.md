# Solana Wallet Provider

The provider included in this directory implements the Solana Wallet Standard v1.0.0 described here:

- https://github.com/anza-xyz/wallet-standard

The implementation process was mostly based on the hints and requirements described here:

- https://github.com/anza-xyz/wallet-standard/blob/master/WALLET.md

## Prerequisites

It needs a [`ChainAgnosticProvider`](https://github.com/ava-labs/vm-modules/blob/6c4039f4d8b27561da9aedd617bb47bbdc3ac1d5/packages/types/src/provider.ts#L65-L77) to be implemented and provided by the wallet attempting to use it.

The `ChainAgnosticProvider` should:

- implement the `request` method following the [CAIP-27](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-27.md) standard
- implement the `subscribeToMessage` method that can be used to subscribe to `connect`, `disconnect` and `accountsChangedCA` events
  - those events should then be dispatched by the wallet whenever appropriate

## How to use it

- Install the module:

  ```
  npm install @avalabs/svm-module
  ```

- Import the provider:

  ```ts
  import { initialize, SolanaWalletProvider } from '@avalabs/svm-module/dist/provider';
  // Yes, importing from `dist` directory is yucky and will be fixed.
  ```

- Initialize it in the wallet:
  ```ts
  initializeSolanaProvider(
    new SolanaWalletProvider(chainAgnosticProvider, {
      icon: `data:image/svg+xml;base64,...`, // your wallet's icon
      name: `My Super Wallet`, // name of your wallet
      version: `1.2.3`, // your wallet's version number
    }),
  );
  ```

## Technical overview

The provider is built out of two main components:

### [`StandardWallet`](./wallet.ts) class

This is the part that is exposed to the dApps.

It acts as the entrypoint for every operation the wallet supports. The `features` property tells the dApp which features are supported and what version of the standard they follow. On top of the standard, it also exposes some of the wallet's metadata, such as name, icon and version.

It also acts as the adapter between the parameters the dApps provide when using the `features` and the parameters the [`SolanaWalletProvider`](#solanawalletprovider) expects.

### [`SolanaWalletProvider`](./provider.ts) class

This, along with [`initializeSolanaProvider`](#initializesolanaprovider), is the part that is exposed to the wallet app.

It implements the [`Connection`](./window.ts#24) interface that the [`StandardWallet`](#standardwallet) will use to connect to the wallet through the `ChainAgnosticProvider`.

It also subscribes to the events emitted by the wallet and notifies the dApp if a relevant change in state has happened.

### [`initializeSolanaProvider`](./initialize.ts) function

This registers the provider and notifies the dApps it is ready to connect to.
