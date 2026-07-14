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

  // Narrow before calling buildDerivationPath — the type guard alone is not
  // enough when `params` is intersected with `{ approvalController }`.
  const derivationPath = hasDerivationDetails(params)
    ? buildDerivationPath({
        accountIndex: params.accountIndex,
        derivationPathType: params.derivationPathType,
        addressIndex: params.addressIndex,
      }).HYPERCORE
    : undefined;
  const publicKeyHex = await approvalController.requestPublicKey({
    curve: 'secp256k1',
    secretId,
    derivationPath,
  });

  return {
    [NetworkVMType.HYPERCORE]: computeAddress(`0x${publicKeyHex}`),
  };
};
