import type { GetAddressParams, GetAddressResponse } from '@avalabs/vm-module-types';
import { getBech32AddressFromXPub, getBtcAddressFromPubKey } from '@avalabs/core-wallets-sdk';
import { networks } from 'bitcoinjs-lib';
import { NetworkVMType, WalletType } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

type GetAddress = Omit<GetAddressParams, 'xpubXP'>;

export const getAddress = async ({
  accountIndex,
  xpub,
  isTestnet,
  walletType,
}: GetAddress): Promise<GetAddressResponse> => {
  switch (walletType) {
    case WalletType.Mnemonic:
    case WalletType.Ledger:
    case WalletType.Keystone: {
      return {
        [NetworkVMType.BITCOIN]: getBech32AddressFromXPub(
          xpub,
          accountIndex,
          isTestnet ? networks.testnet : networks.bitcoin,
        ),
      };
    }
    case WalletType.LedgerLive:
    case WalletType.Seedless: {
      const pubKeyBuffer = Buffer.from(xpub, 'hex');
      return {
        [NetworkVMType.BITCOIN]: getBtcAddressFromPubKey(pubKeyBuffer, isTestnet ? networks.testnet : networks.bitcoin),
      };
    }
    default:
      throw rpcErrors.invalidParams(`Unsupported wallet type: ${walletType}`);
  }
};
