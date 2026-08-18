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

/**
 * Raised when the transaction Blockaid scanned is not the transaction that will be signed.
 *
 * Blockaid's scan API has no field for an EIP-2930 access list, so a transaction carrying one
 * is simulated without it. Warm/cold gas accounting means the same calldata can behave
 * differently with and without that list, and the wallet signs and broadcasts the list either
 * way - so a clean simulation here says nothing about what will actually execute.
 */
export const incompleteScanAlert = {
  type: AlertType.WARNING,
  details: {
    title: 'Simulation is incomplete',
    description: 'This transaction contains data that could not be simulated, so its preview may be wrong.',
    body: [
      'The access list attached to this transaction was not included in the security scan.',
      'What actually executes on-chain may differ from the preview shown here.',
    ],
  },
};

/**
 * Raised when Blockaid could not evaluate the transaction at all.
 *
 * A `result_type` of `Error` is not a verdict of "safe" - it means no verdict was reached.
 * Rendering that as a clean approval tells the reader the transaction was checked and passed,
 * which is the opposite of what happened.
 */
export const scanUnavailableAlert = {
  type: AlertType.WARNING,
  details: {
    title: 'Transaction could not be checked',
    description: 'The security scan did not complete, so this transaction has not been verified.',
    body: ['No security verdict was reached for this transaction.', 'Approve it only if you trust the source.'],
  },
};
