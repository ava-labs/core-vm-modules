import type { ApprovalController, DeriveAddressParams, DeriveAddressResponse } from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';
import { sha256 } from '@noble/hashes/sha256';
import { hex } from '@scure/base';

import { hasDerivationDetails } from '@internal/utils/src/utils/address-derivation';

import { buildDerivationPath } from '../build-derivation-path/build-derivation-path';

const ED25519_AUTH_ID = 0x00;

export const deriveAddress = async (
  params: DeriveAddressParams & { approvalController: ApprovalController },
): Promise<DeriveAddressResponse> => {
  const { approvalController, secretId } = params;

  // When dealing with single-account private keys, we don't need the derivation path any more.
  const derivationPath = hasDerivationDetails(params) ? buildDerivationPath(params).HVM : undefined;

  const publicKeyHex = await approvalController.requestPublicKey({
    curve: 'ed25519',
    secretId,
    derivationPath,
  });
  const publicKeyBytes = hex.decode(publicKeyHex);
  const addressBytes = new Uint8Array([ED25519_AUTH_ID, ...sha256(publicKeyBytes)]);
  const hash = sha256(addressBytes);
  const checksum = hash.slice(-4);

  return {
    [NetworkVMType.HVM]: `0x${hex.encode(addressBytes)}${hex.encode(checksum)}`,
  };
};
