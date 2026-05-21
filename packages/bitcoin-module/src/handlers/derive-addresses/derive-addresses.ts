import type { ApprovalController, DeriveAddressesParams, DeriveAddressesResponse } from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';
import { deriveAddressesForBtc, init } from '@avalabs/crypto-sdk';

import { buildDerivationPath } from '../build-derivation-path/build-derivation-path';

export const deriveAddresses = async (
  params: DeriveAddressesParams & { approvalController: ApprovalController },
): Promise<DeriveAddressesResponse> => {
  const { approvalController, network, secretId, accountIndices, derivationPathType } = params;

  if (accountIndices.length === 0) {
    return [];
  }

  await init();

  const publicKeys = await Promise.all(
    accountIndices.map(async (accountIndex) => {
      const derivationPath = buildDerivationPath({ accountIndex, derivationPathType }).BITCOIN;
      const publicKeyHex = await approvalController.requestPublicKey({
        curve: 'secp256k1',
        secretId,
        derivationPath,
      });
      return Buffer.from(publicKeyHex, 'hex');
    }),
  );

  const addresses = await deriveAddressesForBtc(publicKeys, Boolean(network.isTestnet));

  return addresses.map((address) => ({ [NetworkVMType.BITCOIN]: address }));
};
