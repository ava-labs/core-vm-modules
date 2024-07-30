export enum WalletType {
  // Primary wallet types
  Mnemonic = 'mnemonic',
  Ledger = 'ledger',
  LedgerLive = 'ledger-live',
  Keystone = 'keystone',
  Seedless = 'seedless',
}

type ParamsByWalletType<
  T extends WalletType.Mnemonic | WalletType.Keystone | WalletType.Ledger | WalletType.LedgerLive | WalletType.Seedless,
> = T extends WalletType.Mnemonic | WalletType.Keystone | WalletType.Ledger
  ? { walletType: T; accountIndex: number; xpub: string; xpubXP: string; isTestnet?: boolean }
  : T extends WalletType.LedgerLive | WalletType.Seedless
  ? // xpubXP is optional for LedgerLive and Seedless
    { walletType: T; accountIndex: number; xpub: string; xpubXP?: string; isTestnet?: boolean }
  : never;

export type GetAddressParams = ParamsByWalletType<WalletType>;

export type GetAddressResponse = Record<string, string>;

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
