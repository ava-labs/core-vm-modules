import EventEmitter from 'events';
import { NetworkVMType, RpcMethod, type ChainAgnosticProvider } from '@avalabs/vm-module-types';
import type { PublicKey, SendOptions } from '@solana/web3.js';
import type { SolanaCaip2ChainId } from '@avalabs/core-chains-sdk';

import type { Connection } from './window';
import { legacyPublicKey } from './public-key';
import type { WalletIcon } from '@wallet-standard/base';

enum DAppProviderRequest {
  WALLET_CONNECT = 'wallet_requestAccountPermission',
}

export class SolanaWalletProvider extends EventEmitter implements Connection {
  #chainAgnosticProvider: ChainAgnosticProvider;
  #info: { icon: WalletIcon; version: string; name: string };
  public publicKey: PublicKey | null = null;

  constructor(
    chainAgnosticProvider: ChainAgnosticProvider,
    { icon, version, name }: { icon: WalletIcon; version: string; name: string },
  ) {
    super();
    this.#info = {
      icon,
      name,
      version,
    };
    this.#chainAgnosticProvider = chainAgnosticProvider;
    this.#chainAgnosticProvider.subscribeToMessage(this.#handleBackgroundMessage);
  }

  get info() {
    return this.#info;
  }

  async connect({ onlyIfTrusted }: { onlyIfTrusted?: boolean } = {}) {
    if (this.publicKey) {
      return { publicKey: this.publicKey };
    }

    // We don't use the options, as "onlyIfTrusted" essentially means
    // "connect without approval window if previously approved"
    // and it is already our default mode of operation in Core.
    const [address] = await this.#chainAgnosticProvider.request<[string]>({
      data: {
        method: DAppProviderRequest.WALLET_CONNECT,
        params: { addressVM: NetworkVMType.SVM, onlyIfTrusted },
      },
    });

    this.publicKey = legacyPublicKey(address);
    return { publicKey: this.publicKey };
  }

  async disconnect() {
    this.publicKey = null;
    this.emit('disconnect');
  }

  async signAndSendTransaction(
    account: string,
    caipId: SolanaCaip2ChainId,
    serializedTx: string,
    sendOptions: SendOptions,
  ) {
    const signature = await this.#chainAgnosticProvider.request<string>({
      scope: caipId,
      data: {
        method: RpcMethod.SOLANA_SIGN_AND_SEND_TRANSACTION,
        params: [
          {
            account,
            serializedTx,
            sendOptions,
          },
        ],
      },
    });

    return signature;
  }

  async signTransaction(account: string, caipId: SolanaCaip2ChainId, serializedTx: string) {
    const signedTx = await this.#chainAgnosticProvider.request<string>({
      scope: caipId,
      data: {
        method: RpcMethod.SOLANA_SIGN_TRANSACTION,
        params: [
          {
            account,
            serializedTx,
          },
        ],
      },
    });

    return signedTx;
  }

  #accountsChanged = (accounts: { address: string; vm: NetworkVMType }[]) => {
    const address = accounts.find(({ vm }) => vm === NetworkVMType.SVM)?.address;

    if (!address) {
      // Account switched to an unknown account
      this.disconnect();
    } else if (this.publicKey) {
      // Account switched to a known account
      this.publicKey = legacyPublicKey(address);
      this.emit('accountChanged');
    } else {
      // Account switched to a known account
      this.publicKey = legacyPublicKey(address);
      this.emit('connect');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #getEventHandler = (method: string): ((...params: any[]) => void) => {
    const handlerMap = {
      connect: this.connect,
      disconnect: this.disconnect,
      accountsChangedCA: this.#accountsChanged,
    };

    return handlerMap[method as keyof typeof handlerMap] ?? (() => {});
  };

  #handleBackgroundMessage = ({ method, params }: { method: string; params: unknown }) => {
    const eventHandler = this.#getEventHandler(method);
    if (eventHandler) {
      return eventHandler(params);
    }

    this.emit(method, params);
  };

  async signAllTransactions(address: string, caipId: SolanaCaip2ChainId, serializedTxs: string[]): Promise<string[]> {
    const results: string[] = [];

    for (const tx of serializedTxs) {
      const signedTx = await this.signTransaction(address, caipId, tx);
      results.push(signedTx);
    }

    return results;
  }

  signMessage() {
    throw new Error('signMessage() not implemented.');
  }

  signIn() {
    throw new Error('signIn() not implemented.');
  }
}
