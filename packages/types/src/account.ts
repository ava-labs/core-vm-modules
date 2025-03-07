import type { Network, NetworkVMType } from './common';

export enum WalletType {
  // Primary wallet types
  Mnemonic = 'mnemonic',
  Ledger = 'ledger',
  LedgerLive = 'ledger-live',
  Keystone = 'keystone',
  Seedless = 'seedless',
}

export type GetAddressParams = {
  walletType: WalletType;
  accountIndex: number;
  xpub: string;
  network?: Network;
  xpubXP?: string;
};

export type GetAddressResponse = Record<string, string>;

export type SimpleDeriveAddressParams = {
  network: Network;
  /**
   * ID of the secret key to use for derivation.
   */
  secretId: string;
};
export type DetailedDeriveAddressParams = SimpleDeriveAddressParams & {
  /**
   * Account index for which the public key is requested.
   * Leave empty if requesting a public key for a single-account private key.
   */
  accountIndex: number;
  /**
   * Type of the derivation path to use.
   * Useful when working with Ledger devices, which support BIP44 and Ledger Live derivation paths.
   */
  derivationPathType: DerivationPathType;
};

export type DeriveAddressParams = SimpleDeriveAddressParams | DetailedDeriveAddressParams;

export type DeriveAddressResponse = Partial<Record<NetworkVMType, string>>;

export type DerivationPathType = 'bip44' | 'ledger_live';
export type BuildDerivationPathParams = { accountIndex: number; derivationPathType: DerivationPathType };
export type BuildDerivationPathResponse = Partial<Record<NetworkVMType, string>>;

export type PubKeyType = {
  evm: string;
  /**
   * Public keys used for X/P chain are from a different derivation path.
   */
  xp?: string;
  btcWalletPolicyDetails?: BtcWalletPolicyDetails;
};

export type BtcWalletPolicyDetails = {
  hmacHex: string;
  /**
   * Extended public key of m/44'/60'/n
   */
  xpub: string;
  masterFingerprint: string;
  name: string;
};
