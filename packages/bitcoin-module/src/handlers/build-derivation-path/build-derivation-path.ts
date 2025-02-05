import { rpcErrors } from '@metamask/rpc-errors';
import {
  NetworkVMType,
  type BuildDerivationPathParams,
  type BuildDerivationPathResponse,
} from '@avalabs/vm-module-types';

/**
 * We're deriving the BTC address from the same public key as the Ethereum address,
 * so we can determine the target address when using the Avalanche Bridge.
 */
export const buildDerivationPath = ({
  accountIndex,
  derivationPathType,
}: BuildDerivationPathParams): Pick<BuildDerivationPathResponse, NetworkVMType.BITCOIN> => {
  if (accountIndex < 0) {
    throw rpcErrors.invalidParams('Account index must be a non-negative integer');
  }

  switch (derivationPathType) {
    case 'bip44':
      return {
        [NetworkVMType.BITCOIN]: `m/44'/60'/0'/0/${accountIndex}`,
      };

    case 'ledger_live':
      return {
        [NetworkVMType.BITCOIN]: `m/44'/60'/${accountIndex}'/0/0`,
      };

    default:
      throw rpcErrors.invalidParams(`Unsupported derivation path type: ${derivationPathType}`);
  }
};
