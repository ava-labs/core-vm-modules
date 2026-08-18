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

  if (error?.type === 'TransactionError' && error.message.toLowerCase().includes('insufficient funds for rent')) {
    return {
      type: AlertType.WARNING,
      details: {
        title: 'This transaction will likely be reverted',
        description:
          'The recipient account needs a minimum balance to exist on Solana (rent). Try increasing the amount you send.',
      },
    };
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

/**
 * Raised when a message's lifetime constraint is not live on the cluster being displayed.
 *
 * Solana messages carry no chain id, so the blockhash (or durable-nonce account) is the only
 * thing binding a signature to one cluster. When it does not resolve here, the signature the
 * wallet is about to produce cannot execute on the cluster shown - which either means it has
 * expired, or that it was built for a different cluster and will be broadcast there.
 */
export const wrongClusterAlert = (chainName: string): Alert => ({
  type: AlertType.WARNING,
  details: {
    title: 'This transaction is not anchored to this network',
    description: `Its blockhash is not valid on ${chainName}.`,
    body: [
      `The transaction cannot be executed on ${chainName} as it stands.`,
      'It has either expired, or it was built for a different Solana cluster - in which case the signature you give here could be broadcast there instead.',
    ],
  },
});
