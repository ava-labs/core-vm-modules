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
  const xpDerivationPath = hasDerivationDetails(params) ? buildDerivationPath(params).AVM : undefined;
  const coreEthDerivationPath = hasDerivationDetails(params) ? buildDerivationPath(params).CoreEth : undefined;
  const provXP = await getProvider({ isTestnet: Boolean(network.isTestnet) });

  const xpPublicKeyHex = await approvalController.requestPublicKey({
    curve: 'secp256k1',
    secretId,
    derivationPath: xpDerivationPath,
  });
  const coreEthPublicKeyHex = await approvalController.requestPublicKey({
    curve: 'secp256k1',
    secretId,
    derivationPath: coreEthDerivationPath,
  });

  const publicKeyXP = Buffer.from(xpPublicKeyHex, 'hex');
  const publicKeyCoreEth = Buffer.from(coreEthPublicKeyHex, 'hex');

  return {
    [NetworkVMType.CoreEth]: provXP.getAddress(publicKeyCoreEth, 'C'),
    [NetworkVMType.AVM]: provXP.getAddress(publicKeyXP, 'X'),
    [NetworkVMType.PVM]: provXP.getAddress(publicKeyXP, 'P'),
  };
};
