import { type Alert, AlertType, type TxValueDetails } from '@avalabs/vm-module-types';

export const getExcessiveBurnAlert = (tx: TxValueDetails): Alert | undefined =>
  tx.isValidAvaxBurnedAmount
    ? undefined
    : {
        type: AlertType.WARNING,
        details: {
          title: 'Caution!',
          description:
            'The inputs of this transaction are greater than the outputs. Approving it will burn the difference, which cannot be recovered.',
        },
      };
