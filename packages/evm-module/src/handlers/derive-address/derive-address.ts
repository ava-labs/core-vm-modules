import {
  NetworkVMType,
  type ApprovalController,
  type DeriveAddressParams,
  type DeriveAddressResponse,
  type DetailedDeriveAddressParams,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { computeAddress } from 'ethers';

import { hasDerivationDetails } from '@internal/utils/src/utils/address-derivation';

const getDerivationPath = ({ accountIndex, derivationPathType }: DetailedDeriveAddressParams): string | undefined => {
  if (accountIndex < 0) {
    throw rpcErrors.invalidParams('Account index must be a non-negative integer');
  }

  switch (derivationPathType) {
    case 'bip44':
      return `m/44'/60'/0'/0/${accountIndex}`;

    case 'ledger_live':
      return `m/44'/60'/${accountIndex}'/0/0`;

    default:
      throw rpcErrors.invalidParams(`Unsupported derivation path type: ${derivationPathType}`);
  }
};

export const deriveAddress = async (
  params: DeriveAddressParams & { approvalController: ApprovalController },
): Promise<DeriveAddressResponse> => {
  const { secretId, approvalController } = params;

  // When dealing with single-account private keys, we don't need the derivation path any more.
  const derivationPath = hasDerivationDetails(params) ? getDerivationPath(params) : undefined;
  const publicKeyHex = await approvalController.requestPublicKey({
    curve: 'secp256k1',
    secretId,
    derivationPath,
  });

  return {
    [NetworkVMType.EVM]: computeAddress(`0x${publicKeyHex}`), // ApprovalController does not return the 0x prefix
  };
};
