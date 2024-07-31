import { NetworkVMType, WalletType, type GetAddressParams, type GetAddressResponse } from '@avalabs/vm-module-types';
import { getAddressFromXPub, getEvmAddressFromPubKey } from '@avalabs/wallets-sdk';
import { rpcErrors } from '@metamask/rpc-errors';

type GetAddress = Omit<GetAddressParams, 'isTestnet' | 'xpubXP'>;

export const getAddress = async ({ accountIndex, xpub, walletType }: GetAddress): Promise<GetAddressResponse> => {
  switch (walletType) {
    case WalletType.Mnemonic:
    case WalletType.Ledger:
    case WalletType.Keystone: {
      return {
        [NetworkVMType.EVM]: getAddressFromXPub(xpub, accountIndex),
      };
    }
    case WalletType.LedgerLive:
    case WalletType.Seedless: {
      const pubKeyBuffer = Buffer.from(xpub, 'hex');
      return {
        [NetworkVMType.EVM]: getEvmAddressFromPubKey(pubKeyBuffer),
      };
    }
    default:
      throw rpcErrors.invalidParams(`Unsupported wallet type: ${walletType}`);
  }
};
