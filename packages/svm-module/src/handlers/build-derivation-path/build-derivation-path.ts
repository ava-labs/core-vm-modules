import {
  NetworkVMType,
  type BuildDerivationPathParams,
  type BuildDerivationPathResponse,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

/**
 * We're deriving the BTC address from the same public key as the Ethereum address,
 * so we can determine the target address when using the Avalanche Bridge.
 */
export const buildDerivationPath = ({
  accountIndex,
}: BuildDerivationPathParams): Pick<BuildDerivationPathResponse, NetworkVMType.SVM> => {
  if (accountIndex < 0) {
    throw rpcErrors.invalidParams('Account index must be a non-negative integer');
  }

  return {
    [NetworkVMType.SVM]: `m/44'/501'/${accountIndex}'/0'`,
  };
};
