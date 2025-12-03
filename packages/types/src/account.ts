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
  network: Omit<Network, 'tokens'>;
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

  /**
   * Address index for which the public key will be requested.
   * This is NOT the same as {accountIndex}. Applicable mostly to X/P chain addresses.
   */
  addressIndex?: number;
};

export type DeriveAddressParams = SimpleDeriveAddressParams | DetailedDeriveAddressParams;

export type DeriveAddressResponse = Partial<Record<NetworkVMType, string>>;

export type DerivationPathType = 'bip44' | 'ledger_live';
export type BuildDerivationPathParams = {
  accountIndex: number;
  derivationPathType: DerivationPathType;
  addressIndex?: number;
};
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
