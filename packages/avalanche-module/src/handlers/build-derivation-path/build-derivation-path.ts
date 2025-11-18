import {
  NetworkVMType,
  type BuildDerivationPathParams,
  type BuildDerivationPathResponse,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

export const buildDerivationPath = ({
  accountIndex,
}: BuildDerivationPathParams): Pick<BuildDerivationPathResponse, NetworkVMType.AVM | NetworkVMType.CoreEth> => {
  if (accountIndex < 0) {
    throw rpcErrors.invalidParams('Account index must be a non-negative integer');
  }

  return {
    [NetworkVMType.AVM]: `m/44'/9000'/${accountIndex}'/0/0`,
    [NetworkVMType.CoreEth]: `m/44'/60'/0'/0/${accountIndex}`,
  };
};
