import { SolanaCaip2ChainId } from '@avalabs/core-chains-sdk';
import type { PublicKey, SendOptions } from '@solana/web3.js';
import type { WalletIcon } from '@wallet-standard/base';

export interface ConnectionEvent {
  connect(...args: unknown[]): unknown;
  disconnect(...args: unknown[]): unknown;
  accountChanged(...args: unknown[]): unknown;
}

export interface ConnectionEventEmitter {
  on<E extends keyof ConnectionEvent>(
    event: E,
    listener: ConnectionEvent[E],
    context?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ): void;
  off<E extends keyof ConnectionEvent>(
    event: E,
    listener: ConnectionEvent[E],
    context?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ): void;
}

export interface Connection extends ConnectionEventEmitter {
  publicKey: PublicKey | null;
  info: {
    icon: WalletIcon;
    version: string;
    name: string;
  };
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  signAndSendTransaction(
    account: string,
    caipId: SolanaCaip2ChainId,
    serializedTx: string,
    options?: SendOptions,
  ): Promise<string>;
  signTransaction(account: string, caip2Id: SolanaCaip2ChainId, base64EncodedTx: string): Promise<string>;
  signAllTransactions(account: string, caip2Id: SolanaCaip2ChainId, base64EncodedTxs: string[]): Promise<string[]>;
  signMessage(account: string, base64EncodedMsg: string): Promise<string>;
  // signIn(input?: SolanaSignInInput): Promise<SolanaSignInOutput>;
}
