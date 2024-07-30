import type { GetAddressParams, GetAddressResponse } from '@avalabs/vm-module-types';
import { Avalanche } from '@avalabs/wallets-sdk';
import { NetworkVMType } from '@avalabs/vm-module-types';

type GetAddress = Omit<GetAddressParams, 'xpub'>;

export const getAddress = async ({
  accountIndex,
  isTestnet,
  xpubXP,
  walletType,
}: GetAddress): Promise<GetAddressResponse> => {
  if (xpubXP === undefined) {
    throw new Error('xpubXP is required to get address');
  }

  const provXP = isTestnet
    ? Avalanche.JsonRpcProvider.getDefaultFujiProvider()
    : Avalanche.JsonRpcProvider.getDefaultMainnetProvider();
  let xpPub: Buffer;

  switch (walletType) {
    case 'mnemonic':
    case 'ledger':
    case 'keystone': {
      // X and P addresses different derivation path m/44'/9000'/0'...
      xpPub = Avalanche.getAddressPublicKeyFromXpub(xpubXP, accountIndex);
      break;
    }
    case 'ledger-live':
    case 'seedless': {
      xpPub = Buffer.from(xpubXP, 'hex');
      break;
    }
    default:
      throw new Error(`Unsupported wallet type: ${walletType}`);
  }

  return {
    [NetworkVMType.AVM]: provXP.getAddress(xpPub, 'X'),
    [NetworkVMType.PVM]: provXP.getAddress(xpPub, 'P'),
  };
};
