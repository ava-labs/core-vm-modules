import { AlertType, TxType } from '@avalabs/vm-module-types';

import { utils } from '@avalabs/avalanchejs';

import { FAST_STAKE_ESCROW_ADDRESS } from '../constants';
import { getSuspiciousOutputAlert } from './get-suspicious-output-alert';
import type { TransactionSpendDetails } from './get-transaction-spend-details';

const getOwnerAddressBytes = (address: string) => utils.bufferToHex(utils.parse(address)[2]);

const spendDetails = (overrides: Partial<TransactionSpendDetails> = {}): TransactionSpendDetails => ({
  spentAmounts: {},
  unknownAddresses: [],
  ...overrides,
});

describe('getSuspiciousOutputAlert', () => {
  it('returns a warning when a transaction pays out to an unexpected address', () => {
    const alert = getSuspiciousOutputAlert(
      { type: TxType.CreateSubnet },
      spendDetails({ unknownAddresses: ['0xstranger'] }),
      false,
    );

    expect(alert).toMatchObject({ type: AlertType.WARNING });
    expect(alert?.details.body).toEqual(['This transaction transfers funds outside of your account.']);
  });

  it('returns undefined when everything returns to the signer', () => {
    expect(getSuspiciousOutputAlert({ type: TxType.CreateSubnet }, spendDetails(), false)).toBeUndefined();
  });

  it('returns undefined for a simple BaseTx', () => {
    expect(
      getSuspiciousOutputAlert({ type: TxType.Base }, spendDetails({ unknownAddresses: ['0xstranger'] }), false),
    ).toBeUndefined();
  });

  describe('fast stake', () => {
    it('returns undefined for a mainnet escrow address', () => {
      const alert = getSuspiciousOutputAlert(
        { type: TxType.AddPermissionlessDelegator },
        spendDetails({ unknownAddresses: [getOwnerAddressBytes(FAST_STAKE_ESCROW_ADDRESS.mainnet)] }),
        false,
      );

      expect(alert).toBeUndefined();
    });

    it('returns undefined for a testnet fast stake escrow address', () => {
      const alert = getSuspiciousOutputAlert(
        { type: TxType.AddPermissionlessDelegator },
        spendDetails({ unknownAddresses: [getOwnerAddressBytes(FAST_STAKE_ESCROW_ADDRESS.testnet)] }),
        true,
      );

      expect(alert).toBeUndefined();
    });

    it('returns a warning for an escrow address on any other transaction type', () => {
      const alert = getSuspiciousOutputAlert(
        { type: TxType.AddPermissionlessValidator },
        spendDetails({ unknownAddresses: [getOwnerAddressBytes(FAST_STAKE_ESCROW_ADDRESS.mainnet)] }),
        false,
      );

      expect(alert?.details.body).toEqual(['This transaction transfers funds outside of your account.']);
    });

    it('returns a warning for an unknown address', () => {
      const alert = getSuspiciousOutputAlert(
        { type: TxType.AddPermissionlessDelegator },
        spendDetails({ unknownAddresses: [getOwnerAddressBytes(FAST_STAKE_ESCROW_ADDRESS.mainnet), '0xstranger'] }),
        false,
      );

      expect(alert?.details.body).toEqual(['This transaction transfers funds outside of your account.']);
    });
  });
});
