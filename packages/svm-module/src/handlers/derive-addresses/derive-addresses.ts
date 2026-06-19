import type { ApprovalController, DeriveAddressesParams, DeriveAddressesResponse } from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';
import { deriveAddressesForSvm, init } from '@avalabs/crypto-sdk';

import { buildDerivationPath } from '../build-derivation-path/build-derivation-path';

export const deriveAddresses = async (
  params: DeriveAddressesParams & { approvalController: ApprovalController },
): Promise<DeriveAddressesResponse> => {
  const { approvalController, secretId, accountIndices, derivationPathType } = params;

  if (accountIndices.length === 0) {
    return [];
  }

  await init();

  const publicKeys = await Promise.all(
    accountIndices.map(async (accountIndex) => {
      const derivationPath = buildDerivationPath({ accountIndex, derivationPathType }).SVM;
      const publicKeyHex = await approvalController.requestPublicKey({
        curve: 'ed25519',
        secretId,
        derivationPath,
      });
      return Uint8Array.from(Buffer.from(publicKeyHex, 'hex'));
    }),
  );

  const addresses = await deriveAddressesForSvm(publicKeys);

  return addresses.map((address) => ({ [NetworkVMType.SVM]: address }));
};
