import type { ApprovalController, DeriveAddressParams, DeriveAddressResponse } from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';
import { base58, hex } from '@scure/base';

import { hasDerivationDetails } from '@internal/utils/src/utils/address-derivation';
import { buildDerivationPath } from '../build-derivation-path/build-derivation-path';

export const deriveAddress = async (
  params: DeriveAddressParams & { approvalController: ApprovalController },
): Promise<DeriveAddressResponse> => {
  const { approvalController, secretId } = params;

  // When dealing with single-account private keys, we don't need the derivation path any more.
  const derivationPath = hasDerivationDetails(params) ? buildDerivationPath(params).SVM : undefined;
  const publicKeyHex = await approvalController.requestPublicKey({
    curve: 'ed25519',
    secretId,
    derivationPath,
  });

  return {
    [NetworkVMType.SVM]: base58.encode(hex.decode(publicKeyHex)),
  };
};
