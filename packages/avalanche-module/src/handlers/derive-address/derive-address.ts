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
  const provXP = await getProvider({
    isTestnet: Boolean(network.isTestnet),
    customRpcHeaders: network.customRpcHeaders,
  });

  const xpPublicKeyHex = await approvalController
    .requestPublicKey({
      curve: 'secp256k1',
      secretId,
      derivationPath: xpDerivationPath,
    })
    .catch(() => null);
  const coreEthPublicKeyHex = await approvalController
    .requestPublicKey({
      curve: 'secp256k1',
      secretId,
      derivationPath: coreEthDerivationPath,
    })
    .catch(() => null);

  // Resolve CoreEth address even if X/P public keys are not available
  const coreEthAddress = coreEthPublicKeyHex
    ? {
        [NetworkVMType.CoreEth]: provXP.getAddress(Buffer.from(coreEthPublicKeyHex, 'hex'), 'C'),
      }
    : {};

  const xpAddresses = xpPublicKeyHex
    ? {
        [NetworkVMType.AVM]: provXP.getAddress(Buffer.from(xpPublicKeyHex, 'hex'), 'X'),
        [NetworkVMType.PVM]: provXP.getAddress(Buffer.from(xpPublicKeyHex, 'hex'), 'P'),
      }
    : {};

  return {
    ...coreEthAddress,
    ...xpAddresses,
  };
};
