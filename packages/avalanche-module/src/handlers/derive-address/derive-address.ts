import type { ApprovalController, DeriveAddressParams, DeriveAddressResponse } from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';

import { hasDerivationDetails } from '@internal/utils/src/utils/address-derivation';

import { getProvider } from '../../utils/get-provider';
import { buildDerivationPath } from '../build-derivation-path/build-derivation-path';

export const deriveAddress = async (
  params: DeriveAddressParams & { approvalController: ApprovalController },
): Promise<DeriveAddressResponse> => {
  const { approvalController, network, secretId } = params;

  // When dealing with single-account private keys, we don't need the derivation path any more.
  const derivationPath = hasDerivationDetails(params) ? buildDerivationPath(params).AVM : undefined;
  const provXP = await getProvider({ isTestnet: Boolean(network.isTestnet) });

  const publicKeyHex = await approvalController.requestPublicKey({
    curve: 'secp256k1',
    secretId,
    derivationPath,
  });
  const publicKey = Buffer.from(publicKeyHex, 'hex');

  return {
    [NetworkVMType.CoreEth]: provXP.getAddress(publicKey, 'C'),
    [NetworkVMType.AVM]: provXP.getAddress(publicKey, 'X'),
    [NetworkVMType.PVM]: provXP.getAddress(publicKey, 'P'),
  };
};
