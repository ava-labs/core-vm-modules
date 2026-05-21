import type { ApprovalController, DeriveAddressesParams, DeriveAddressesResponse } from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';
import { deriveAddressesForAvalanche, init } from '@avalabs/crypto-sdk';

import { buildDerivationPath } from '../build-derivation-path/build-derivation-path';

export const deriveAddresses = async (
  params: DeriveAddressesParams & { approvalController: ApprovalController },
): Promise<DeriveAddressesResponse> => {
  const { approvalController, network, secretId, accountIndices, derivationPathType, addressIndex } = params;

  if (accountIndices.length === 0) {
    return [];
  }

  await init();

  // crypto-sdk's deriveAddressesForAvalanche needs the X/P pubkey AND the EVM
  // pubkey (the latter drives the CoreEth bech32 — same path as the EVM module).
  // The avalanche buildDerivationPath's CoreEth entry already returns that EVM path.
  const pubkeyPairs = await Promise.all(
    accountIndices.map(async (accountIndex) => {
      const paths = buildDerivationPath({ accountIndex, derivationPathType, addressIndex });
      const [xpHex, evmHex] = await Promise.all([
        approvalController.requestPublicKey({
          curve: 'secp256k1',
          secretId,
          derivationPath: paths.AVM,
        }),
        approvalController.requestPublicKey({
          curve: 'secp256k1',
          secretId,
          derivationPath: paths.CoreEth,
        }),
      ]);
      return { xp: Buffer.from(xpHex, 'hex'), evm: Buffer.from(evmHex, 'hex') };
    }),
  );

  const bundles = await deriveAddressesForAvalanche(
    pubkeyPairs.map((p) => p.xp),
    pubkeyPairs.map((p) => p.evm),
    Boolean(network.isTestnet),
  );

  return bundles.map((b) => ({
    [NetworkVMType.AVM]: b.x,
    [NetworkVMType.PVM]: b.p,
    [NetworkVMType.CoreEth]: b.coreEth,
  }));
};
