import type {
  ApprovalController,
  DeriveAddressParams,
  DeriveAddressResponse,
  DetailedDeriveAddressParams,
} from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { base58, hex } from '@scure/base';

import { hasDerivationDetails } from '@internal/utils/src/utils/address-derivation';

/**
 * We're deriving the BTC address from the same public key as the Ethereum address,
 * so we can determine the target address when using the Avalanche Bridge.
 */
const getDerivationPath = ({ accountIndex }: DetailedDeriveAddressParams): string | undefined => {
  if (accountIndex < 0) {
    throw rpcErrors.invalidParams('Account index must be a non-negative integer');
  }

  return `m/44'/501'/${accountIndex}'/0'`;
};

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

  return {
    [NetworkVMType.SVM]: base58.encode(hex.decode(publicKeyHex)),
  };
};
