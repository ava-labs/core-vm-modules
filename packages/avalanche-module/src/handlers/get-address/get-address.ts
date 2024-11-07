import type { GetAddressParams, GetAddressResponse } from '@avalabs/vm-module-types';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { NetworkVMType, WalletType } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { getProvider } from '../../utils/get-provider';

type GetAddress = Omit<GetAddressParams, 'xpub'>;

export const getAddress = async ({
  accountIndex,
  isTestnet,
  xpubXP,
  walletType,
  isDevnet,
}: GetAddress): Promise<GetAddressResponse> => {
  if (xpubXP === undefined) {
    throw rpcErrors.invalidParams('xpubXP is required to get address');
  }

  const provXP = await getProvider({ isTestnet: Boolean(isTestnet), isDevnet });
  let xpPub: Buffer;

  switch (walletType) {
    case WalletType.Mnemonic:
    case WalletType.Ledger:
    case WalletType.Keystone: {
      // X and P addresses different derivation path m/44'/9000'/0'...
      xpPub = Avalanche.getAddressPublicKeyFromXpub(xpubXP, accountIndex);
      break;
    }
    case WalletType.LedgerLive:
    case WalletType.Seedless: {
      xpPub = Buffer.from(xpubXP, 'hex');
      break;
    }
    default:
      throw rpcErrors.invalidParams(`Unsupported wallet type: ${walletType}`);
  }

  return {
    [NetworkVMType.AVM]: provXP.getAddress(xpPub, 'X'),
    [NetworkVMType.PVM]: provXP.getAddress(xpPub, 'P'),
  };
};
