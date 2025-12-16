import { AlertType } from '@avalabs/vm-module-types';

export const transactionAlerts = {
  [AlertType.WARNING]: {
    type: AlertType.WARNING,
    details: {
      title: 'Suspicious transaction',
      description: 'Use caution, this transaction might be malicious.',
    },
  },
  [AlertType.DANGER]: {
    type: AlertType.DANGER,
    details: {
      title: 'Scam transaction',
      description: 'This transaction has been flagged as malicious, I understand the risk.',
      body: ['This transaction is malicious', 'do not proceed'],
      actionTitles: {
        reject: 'Reject Transaction',
        proceed: 'Proceed Anyway',
      },
    },
  },
};
