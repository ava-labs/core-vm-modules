import {
  NetworkVMType,
  type ApprovalController,
  type DeriveAddressParams,
  type DeriveAddressResponse,
} from '@avalabs/vm-module-types';
import { computeAddress } from 'ethers';

import { hasDerivationDetails } from '@internal/utils/src/utils/address-derivation';
import { buildDerivationPath } from '../build-derivation-path/build-derivation-path';

export const deriveAddress = async (
  params: DeriveAddressParams & { approvalController: ApprovalController },
): Promise<DeriveAddressResponse> => {
  const { secretId, approvalController } = params;

  // When dealing with single-account private keys, we don't need the derivation path any more.
  const derivationPath = hasDerivationDetails(params) ? buildDerivationPath(params).EVM : undefined;
  const publicKeyHex = await approvalController.requestPublicKey({
    curve: 'secp256k1',
    secretId,
    derivationPath,
  });

  return {
    [NetworkVMType.EVM]: computeAddress(`0x${publicKeyHex}`), // ApprovalController does not return the 0x prefix
  };
};
