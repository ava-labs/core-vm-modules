import { rpcErrors } from '@metamask/rpc-errors';
import {
  NetworkVMType,
  type BuildDerivationPathParams,
  type BuildDerivationPathResponse,
} from '@avalabs/vm-module-types';

/**
 * HyperVM shares the same derivation path as AVM and PVM,
 * with the exception that the path levels are hardened (required for Ed25519).
 *
 * We reuse "9000" coin index so we don't need to request more privileges
 * from hardware wallets users (like Ledger).
 */
export const buildDerivationPath = ({
  accountIndex,
  derivationPathType,
}: BuildDerivationPathParams): Pick<BuildDerivationPathResponse, NetworkVMType.HVM> => {
  if (accountIndex < 0) {
    throw rpcErrors.invalidParams('Account index must be a non-negative integer');
  }

  switch (derivationPathType) {
    case 'bip44':
      return {
        [NetworkVMType.HVM]: `m/44'/9000'/0'/0'/${accountIndex}'`,
      };

    case 'ledger_live':
      return {
        [NetworkVMType.HVM]: `m/44'/9000'/${accountIndex}'/0'/0'`,
      };

    default:
      throw rpcErrors.invalidParams(`Unsupported derivation path type: ${derivationPathType}`);
  }
};
