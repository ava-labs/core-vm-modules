import { rpcErrors } from '@metamask/rpc-errors';
import {
  NetworkVMType,
  type BuildDerivationPathParams,
  type BuildDerivationPathResponse,
} from '@avalabs/vm-module-types';

/**
 * HyperCore identity is an EVM address (cointype 60). Paths match the EVM module;
 * the result is keyed as `HYPERCORE`.
 */
export const buildDerivationPath = ({
  accountIndex,
  derivationPathType,
}: BuildDerivationPathParams): Pick<BuildDerivationPathResponse, NetworkVMType.HYPERCORE> => {
  if (accountIndex < 0) {
    throw rpcErrors.invalidParams('Account index must be a non-negative integer');
  }

  switch (derivationPathType) {
    case 'bip44':
      return {
        [NetworkVMType.HYPERCORE]: `m/44'/60'/0'/0/${accountIndex}`,
      };

    case 'ledger_live':
      return {
        [NetworkVMType.HYPERCORE]: `m/44'/60'/${accountIndex}'/0/0`,
      };

    default:
      throw rpcErrors.invalidParams(`Unsupported derivation path type: ${derivationPathType}`);
  }
};
