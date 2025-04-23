import { AlertType } from '@avalabs/vm-module-types';

export const transactionAlerts = {
  [AlertType.WARNING]: {
    type: AlertType.WARNING,
    details: {
      title: 'Suspicious Transaction',
      description: 'Use caution, this transaction may be malicious.',
    },
  },
  [AlertType.DANGER]: {
    type: AlertType.DANGER,
    details: {
      title: 'Scam Transaction',
      description: 'This transaction has been flagged as malicious, I understand the risk.',
      actionTitles: {
        reject: 'Reject Transaction',
        proceed: 'Proceed Anyway',
      },
    },
  },
};
