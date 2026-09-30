import type { Alert, TxValueDetails, TxType } from '@avalabs/vm-module-types';
import { getExcessiveBurnAlert } from './get-excessive-burn-alert';
import { getSuspiciousOutputAlert } from './get-suspicious-output-alert';
import type { TransactionSpendDetails } from './get-transaction-spend-details';

export const getTransactionAlert = (
  txDetails: TxValueDetails & { type: TxType },
  spendDetails: TransactionSpendDetails,
  isTestnet: boolean,
): Alert | undefined => {
  const alerts = [
    getExcessiveBurnAlert(txDetails),
    getSuspiciousOutputAlert(txDetails, spendDetails, isTestnet),
  ].filter((alert): alert is Alert => alert !== undefined);

  const [firstAlert] = alerts;

  if (!firstAlert) {
    return undefined;
  }

  const body = alerts.flatMap((alert) => alert.details.body ?? [alert.details.description]);

  return {
    ...firstAlert,
    details: { ...firstAlert.details, description: body.join(' '), body },
  };
};
