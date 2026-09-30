import { type Alert, AlertType, TxType } from '@avalabs/vm-module-types';
import { utils } from '@avalabs/avalanchejs';
import { FAST_STAKE_ESCROW_ADDRESS } from '../constants';
import { getSignerAddresses } from './get-signer-addresses';
import type { TransactionSpendDetails } from './get-transaction-spend-details';

export const SUSPICIOUS_OUTPUT_ALERT = 'This transaction transfers funds outside of your account.';

const _getCoreEscrowAddresses = (isTestnet: boolean) =>
  getSignerAddresses([isTestnet ? FAST_STAKE_ESCROW_ADDRESS.testnet : FAST_STAKE_ESCROW_ADDRESS.mainnet]).map(
    utils.bufferToHex,
  );

const _isAllowed = (owner: string, type: TxType, isTestnet: boolean) =>
  type === TxType.AddPermissionlessDelegator && _getCoreEscrowAddresses(isTestnet).includes(owner);

export const getSuspiciousOutputAlert = (
  txDetails: { type: TxType },
  spendDetails: TransactionSpendDetails,
  isTestnet: boolean,
): Alert | undefined => {
  if (txDetails.type === TxType.Base) {
    return undefined;
  }

  const suspiciousAddresses = spendDetails.unknownAddresses.filter(
    (owner) => !_isAllowed(owner, txDetails.type, isTestnet),
  );

  return suspiciousAddresses.length === 0
    ? undefined
    : {
        type: AlertType.WARNING,
        details: { title: 'Caution!', description: SUSPICIOUS_OUTPUT_ALERT, body: [SUSPICIOUS_OUTPUT_ALERT] },
      };
};
