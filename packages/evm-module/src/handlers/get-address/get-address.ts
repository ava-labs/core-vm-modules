import { NetworkVMType, type GetAddressParams, type GetAddressResponse } from '@avalabs/vm-module-types';
import { getAddressFromXPub, getEvmAddressFromPubKey } from '@avalabs/wallets-sdk';

type GetAddress = Omit<GetAddressParams, 'isTestnet' | 'xpubXP'>;

export const getAddress = async ({ accountIndex, xpub, walletType }: GetAddress): Promise<GetAddressResponse> => {
  switch (walletType) {
    case 'mnemonic':
    case 'ledger':
    case 'keystone': {
      return {
        [NetworkVMType.EVM]: getAddressFromXPub(xpub, accountIndex),
      };
    }
    case 'ledger-live':
    case 'seedless': {
      const pubKeyBuffer = Buffer.from(xpub, 'hex');
      return {
        [NetworkVMType.EVM]: getEvmAddressFromPubKey(pubKeyBuffer),
      };
    }
    default:
      throw new Error(`Unsupported wallet type: ${walletType}`);
  }
};
