import type {
  ApprovalController,
  DeriveAddressParams,
  DeriveAddressResponse,
  DetailedDeriveAddressParams,
} from '@avalabs/vm-module-types';
import { NetworkVMType } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { strip0x } from '@avalabs/core-utils-sdk';

import { hasDerivationDetails } from '@internal/utils/src/utils/address-derivation';

import { getBtcAddressFromPubKey } from '@avalabs/core-wallets-sdk';
import { networks } from 'bitcoinjs-lib';

/**
 * We're deriving the BTC address from the same public key as the Ethereum address,
 * so we can determine the target address when using the Avalanche Bridge.
 */
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
  const { approvalController, network, secretId } = params;

  // When dealing with single-account private keys, we don't need the derivation path any more.
  const derivationPath = hasDerivationDetails(params) ? getDerivationPath(params) : undefined;
  const publicKeyHex = await approvalController.requestPublicKey({
    algorithm: 'secp256k1',
    secretId,
    derivationPath,
  });
  const publicKey = Buffer.from(strip0x(publicKeyHex), 'hex');

  return {
    [NetworkVMType.BITCOIN]: getBtcAddressFromPubKey(
      publicKey,
      network.isTestnet ? networks.testnet : networks.bitcoin,
    ),
  };
};
