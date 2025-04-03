import EventEmitter from 'events';
import { NetworkVMType, RpcMethod, type ChainAgnosticProvider } from '@avalabs/vm-module-types';
import type { PublicKey, SendOptions } from '@solana/web3.js';
import { SolanaCaip2ChainId } from '@avalabs/core-chains-sdk';

import type { Connection } from './window';
import { legacyPublicKey } from './public-key';
import type { WalletIcon } from '@wallet-standard/base';

enum DAppProviderRequest {
  WALLET_CONNECT = 'wallet_requestAccountPermission',
}

/**
 * Represents a Solana Wallet Provider that interacts with a chain-agnostic provider
 * to manage wallet connections, transactions, and events.
 *
 * @extends EventEmitter
 * @implements Connection
 */
export class SolanaWalletProvider extends EventEmitter implements Connection {
  public publicKey: PublicKey | null = null;

  readonly #chainAgnosticProvider: ChainAgnosticProvider;
  readonly #info: { icon: WalletIcon; version: string; name: string };

  /**
   * Creates an instance of SolanaWalletProvider.
   *
   * @param chainAgnosticProvider - The chain-agnostic provider used for communication.
   * @param options - Wallet information including icon, version, and name.
   */
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

  /**
   * Retrieves wallet metadata such as icon, version, and name.
   */
  get info() {
    return this.#info;
  }

  /**
   * Connects to the wallet. If already connected, returns the public key.
   *
   * @param options - Connection options.
   * @param options.onlyIfTrusted - If true, connects without approval if previously approved.
   * @returns An object containing the public key.
   */
  async connect({ onlyIfTrusted }: { onlyIfTrusted?: boolean } = {}) {
    if (this.publicKey) {
      return { publicKey: this.publicKey };
    }

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

  /**
   * Signs and sends a transaction.
   *
   * @param account - The account to use for signing.
   * @param caipId - The Solana CAIP-2 chain ID.
   * @param serializedTx - The serialized transaction to sign and send.
   * @param sendOptions - Options for sending the transaction. See the docs here: https://solana.com/pl/docs/rpc/http/sendtransaction.
   * @returns The transaction signature.
   */
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

  /**
   * Signs a transaction without sending it.
   *
   * @param account - The account to use for signing.
   * @param caipId - The Solana CAIP-2 chain ID.
   * @param serializedTx - The serialized transaction to sign.
   * @returns The signed transaction.
   */
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

  /**
   * Handles account changes by updating the public key and emitting appropriate events.
   * The incoming {accounts} array may include non-Solana accounts, so we filter for the
   * address described with the Solana VM type.
   */
  #accountsChanged = (accounts: { address: string; vm: NetworkVMType }[]) => {
    const address = accounts.find(({ vm }) => vm === NetworkVMType.SVM)?.address;

    if (!address) {
      // Account switched to an unknown account
      this.disconnect();
    } else if (this.publicKey) {
      // Account switched to a known account while we're already connected to a different one
      this.publicKey = legacyPublicKey(address);
      this.emit('accountChanged');
    } else {
      // Account switched to a known account while we're not connected
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

  /**
   * Signs multiple transactions without sending them.
   *
   * @param address - The address to use for signing.
   * @param caipId - The Solana CAIP-2 chain ID.
   * @param serializedTxs - An array of serialized transactions to sign.
   * @returns An array of signed transactions.
   */
  async signAllTransactions(address: string, caipId: SolanaCaip2ChainId, serializedTxs: string[]): Promise<string[]> {
    const results: string[] = [];

    for (const tx of serializedTxs) {
      const signedTx = await this.signTransaction(address, caipId, tx);
      results.push(signedTx);
    }

    return results;
  }

  async signMessage(account: string, serializedMessage: string): Promise<string> {
    const signature = await this.#chainAgnosticProvider.request<string>({
      scope: SolanaCaip2ChainId.MAINNET, // Solana dApps do not pass it as they do for transactions, so we fake
      data: {
        method: RpcMethod.SOLANA_SIGN_MESSAGE,
        params: [
          {
            account,
            serializedMessage,
          },
        ],
      },
    });

    return signature;
  }

  signIn() {
    throw new Error('signIn() not implemented.');
  }
}
