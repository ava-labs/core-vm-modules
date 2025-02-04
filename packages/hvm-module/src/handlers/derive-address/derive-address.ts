import type {
  ApprovalController,
  DeriveAddressParams,
  DeriveAddressResponse,
  DetailedDeriveAddressParams,
} from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { sha256 } from '@noble/hashes/sha256';
import { hex } from '@scure/base';

import { hasDerivationDetails } from '@internal/utils/src/utils/address-derivation';

/**
 * HyperVM shares the same derivation path as AVM and PVM,
 * with the exception that the path levels are hardened (required for Ed25519).
 *
 * We reuse "9000" coin index so we don't need to request more privileges
 * from hardware wallets users (like Ledger).
 */
const getDerivationPath = ({ accountIndex, derivationPathType }: DetailedDeriveAddressParams): string | undefined => {
  if (accountIndex < 0) {
    throw rpcErrors.invalidParams('Account index must be a non-negative integer');
  }

  switch (derivationPathType) {
    case 'bip44':
      return `m/44'/9000'/0'/0'/${accountIndex}'`;

    case 'ledger_live':
      return `m/44'/9000'/${accountIndex}'/0'/0'`;

    default:
      throw rpcErrors.invalidParams(`Unsupported derivation path type: ${derivationPathType}`);
  }
};

const ED25519_AUTH_ID = 0x00;

export const deriveAddress = async (
  params: DeriveAddressParams & { approvalController: ApprovalController },
): Promise<DeriveAddressResponse> => {
  const { approvalController, secretId } = params;

  // When dealing with single-account private keys, we don't need the derivation path any more.
  const derivationPath = hasDerivationDetails(params) ? getDerivationPath(params) : undefined;

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
