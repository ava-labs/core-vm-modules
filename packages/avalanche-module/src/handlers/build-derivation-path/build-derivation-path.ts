import {
  NetworkVMType,
  type BuildDerivationPathParams,
  type BuildDerivationPathResponse,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

export const buildDerivationPath = ({
  accountIndex,
  derivationPathType,
  addressIndex = 0,
}: BuildDerivationPathParams): Pick<BuildDerivationPathResponse, NetworkVMType.AVM | NetworkVMType.CoreEth> => {
  if (accountIndex < 0) {
    throw rpcErrors.invalidParams('Account index must be a non-negative integer');
  }

  if (addressIndex !== undefined && addressIndex < 0) {
    throw rpcErrors.invalidParams('Address index must be a non-negative integer');
  }

  switch (derivationPathType) {
    case 'bip44':
      return {
        [NetworkVMType.AVM]: `m/44'/9000'/${accountIndex}'/0/${addressIndex}`,
        [NetworkVMType.CoreEth]: `m/44'/60'/0'/0/${accountIndex}`, // Must match the derivation path used by the EMV Module
      };

    case 'ledger_live':
      return {
        [NetworkVMType.AVM]: `m/44'/9000'/${accountIndex}'/0/${addressIndex}`,
        [NetworkVMType.CoreEth]: `m/44'/60'/${accountIndex}'/0/0`, // Must match the derivation path used by the EMV Module
      };

    default:
      throw rpcErrors.invalidParams(`Unsupported derivation path type: ${derivationPathType}`);
  }
};
