import { AlertType, type TxValueDetails } from '@avalabs/vm-module-types';

import { getExcessiveBurnAlert } from './get-excessive-burn-alert';

const valueDetails = (overrides: Partial<TxValueDetails> = {}): TxValueDetails => ({
  outputs: [],
  inputAmounts: {},
  outputAmounts: {},
  totalAvaxInput: 0n,
  totalAvaxOutput: 0n,
  totalAvaxBurned: 0n,
  isValidAvaxBurnedAmount: true,
  ...overrides,
});

describe('getExcessiveBurnAlert', () => {
  it('returns burn amount checker warning properly when isValidAvaxBurnedAmount is false', () => {
    const alert = getExcessiveBurnAlert(valueDetails({ isValidAvaxBurnedAmount: false }));

    expect(alert).toMatchObject({ type: AlertType.WARNING });
    expect(alert?.details.title).toEqual('Caution!');
  });

  it('does not return burn amount checker warning when isValidAvaxBurnedAmount is true', () => {
    expect(getExcessiveBurnAlert(valueDetails({ isValidAvaxBurnedAmount: true }))).toBeUndefined();
  });
});
