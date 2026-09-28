import { AlertType, type TxValueDetails, TxType } from '@avalabs/vm-module-types';

import { BURN_ALERT } from './get-excessive-burn-alert';
import { SUSPICIOUS_OUTPUT_ALERT } from './get-suspicious-output-alert';
import { getTransactionAlert } from './get-transaction-alert';
import type { TransactionSpendDetails } from './get-transaction-spend-details';

const createTxDetails = (overrides: Partial<TxValueDetails> = {}) =>
  ({
    type: TxType.CreateSubnet,
    outputs: [],
    inputAmounts: {},
    outputAmounts: {},
    totalAvaxInput: 0n,
    totalAvaxOutput: 0n,
    totalAvaxBurned: 0n,
    isValidAvaxBurnedAmount: true,
    ...overrides,
  }) as TxValueDetails & { type: TxType };

const getSpendDetails = (overrides: Partial<TransactionSpendDetails> = {}): TransactionSpendDetails => ({
  spentAmounts: {},
  unknownAddresses: [],
  ...overrides,
});

const getAlert = (txDetails: Partial<TxValueDetails>, spendDetails: Partial<TransactionSpendDetails> = {}) =>
  getTransactionAlert(createTxDetails(txDetails), getSpendDetails(spendDetails), false);

describe('getTransactionAlert', () => {
  it('returns undefined when there is no alert', () => {
    expect(getAlert({})).toBeUndefined();
  });

  it('returns an excessive burn alert when needed', () => {
    const alert = getAlert({ isValidAvaxBurnedAmount: false });

    expect(alert).toMatchObject({ type: AlertType.WARNING });
    expect(alert?.details.body).toEqual([BURN_ALERT]);
  });

  it('returns a suspicious output alert when needed', () => {
    const alert = getAlert({}, { unknownAddresses: ['0xstranger'] });

    expect(alert?.details.body).toEqual([SUSPICIOUS_OUTPUT_ALERT]);
  });

  it('returns both alerts when both needed', () => {
    const alert = getAlert({ isValidAvaxBurnedAmount: false }, { unknownAddresses: ['0xstranger'] });

    expect(alert?.details.body).toEqual([BURN_ALERT, SUSPICIOUS_OUTPUT_ALERT]);
  });

  it('carries the title of the reason it reports', () => {
    expect(getAlert({ isValidAvaxBurnedAmount: false })?.details.title).toEqual('Caution!');
  });
});
