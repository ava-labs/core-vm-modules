import type { ApprovalController, DeriveAddressesParams, DeriveAddressesResponse } from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';
import { sha256 } from '@noble/hashes/sha256';
import { hex } from '@scure/base';

import { buildDerivationPath } from '../build-derivation-path/build-derivation-path';

const ED25519_AUTH_ID = 0x00;

// crypto-sdk has no HVM encoder yet, so this handler keeps interface parity
// with the other modules but encodes locally using the same logic as
// derive-address (ed25519 pubkey -> sha256 -> AUTH_ID prefix + 4-byte checksum).
export const deriveAddresses = async (
  params: DeriveAddressesParams & { approvalController: ApprovalController },
): Promise<DeriveAddressesResponse> => {
  const { approvalController, secretId, accountIndices, derivationPathType } = params;

  if (accountIndices.length === 0) {
    return [];
  }

  const addresses = await Promise.all(
    accountIndices.map(async (accountIndex) => {
      const derivationPath = buildDerivationPath({ accountIndex, derivationPathType }).HVM;
      const publicKeyHex = await approvalController.requestPublicKey({
        curve: 'ed25519',
        secretId,
        derivationPath,
      });
      const publicKeyBytes = hex.decode(publicKeyHex);
      const addressBytes = new Uint8Array([ED25519_AUTH_ID, ...sha256(publicKeyBytes)]);
      const checksum = sha256(addressBytes).slice(-4);
      return `0x${hex.encode(addressBytes)}${hex.encode(checksum)}`;
    }),
  );

  return addresses.map((address) => ({ [NetworkVMType.HVM]: address }));
};
