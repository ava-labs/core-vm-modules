import type { ApprovalController, DeriveAddressParams, DeriveAddressResponse } from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';

import { hasDerivationDetails } from '@internal/utils/src/utils/address-derivation';

import { getBtcAddressFromPubKey } from '@avalabs/core-wallets-sdk';
import { networks } from 'bitcoinjs-lib';
import { buildDerivationPath } from '../build-derivation-path/build-derivation-path';

export const deriveAddress = async (
  params: DeriveAddressParams & { approvalController: ApprovalController },
): Promise<DeriveAddressResponse> => {
  const { approvalController, isTestnet, secretId } = params;

  // When dealing with single-account private keys, we don't need the derivation path any more.
  const derivationPath = hasDerivationDetails(params) ? buildDerivationPath(params).BITCOIN : undefined;
  const publicKeyHex = await approvalController.requestPublicKey({
    curve: 'secp256k1',
    secretId,
    derivationPath,
  });
  const publicKey = Buffer.from(publicKeyHex, 'hex');

  return {
    [NetworkVMType.BITCOIN]: getBtcAddressFromPubKey(publicKey, isTestnet ? networks.testnet : networks.bitcoin),
  };
};
