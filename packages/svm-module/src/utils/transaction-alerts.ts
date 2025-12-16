import { AlertType, type Alert } from '@avalabs/vm-module-types';
import type { MessageScanResponse } from '@blockaid/client/resources/solana/message';

export const getAlertForError = (error: MessageScanResponse['error_details']): Alert => {
  if (error?.type === 'InstructionError') {
    switch (error.code) {
      case 'ResultWithNegativeLamports':
        return {
          type: AlertType.WARNING,
          details: {
            title: 'This transaction will likely be reverted',
            description: 'Your account does not have enough SOL to perform the operation',
          },
        };
    }
  }

  return {
    type: AlertType.WARNING,
    details: {
      title: 'Transaction simulation has failed',
      description: 'It is possible that this transaction will fail. Please proceed with caution.',
    },
  };
};

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
      description: 'This transaction is malicious, do not proceed.',
      body: ['This transaction is malicious', 'do not proceed'],
      actionTitles: {
        reject: 'Reject Transaction',
        proceed: 'Proceed Anyway',
      },
    },
  },
};
