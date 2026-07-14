import {
  NetworkVMType,
  type ApprovalController,
  type DeriveAddressesParams,
  type DeriveAddressesResponse,
} from '@avalabs/vm-module-types';
import { deriveAddressesForEvm, init } from '@avalabs/crypto-sdk';
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
      const derivationPath = buildDerivationPath({ accountIndex, derivationPathType }).HYPERCORE;
      const publicKeyHex = await approvalController.requestPublicKey({
        curve: 'secp256k1',
        secretId,
        derivationPath,
      });
      return Uint8Array.from(Buffer.from(publicKeyHex, 'hex'));
    }),
  );

  const addresses = await deriveAddressesForEvm(publicKeys);

  return addresses.map((address) => ({ [NetworkVMType.HYPERCORE]: address }));
};
