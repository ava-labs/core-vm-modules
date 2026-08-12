import { AlertType, type Alert } from '@avalabs/vm-module-types';
import { mergeAlerts } from './merge-alerts';

const simulationAlert: Alert = {
  type: AlertType.DANGER,
  details: { title: 'Malicious dApp', description: 'This site is known to steal funds' },
};

const validationAlert: Alert = {
  type: AlertType.INFO,
  details: { title: 'Warning: Verify Message Content', description: 'This message contains non-standard elements.' },
};

describe('mergeAlerts', () => {
  it('returns undefined when there is nothing to show', () => {
    expect(mergeAlerts(undefined, undefined)).toBeUndefined();
  });

  it('returns the only alert available', () => {
    expect(mergeAlerts(simulationAlert, undefined)).toBe(simulationAlert);
    expect(mergeAlerts(undefined, validationAlert)).toBe(validationAlert);
  });

  it('leads with the more severe alert and keeps the other one in the body', () => {
    const result = mergeAlerts(validationAlert, simulationAlert);

    expect(result?.type).toBe(AlertType.DANGER);
    expect(result?.details.title).toBe('Malicious dApp');
    expect(result?.details.body).toEqual([
      'Warning: Verify Message Content: This message contains non-standard elements.',
    ]);
  });

  it('never drops the message validation warning when a simulation alert is present', () => {
    const result = mergeAlerts(simulationAlert, validationAlert);

    expect(result?.details.body).toEqual([
      'Warning: Verify Message Content: This message contains non-standard elements.',
    ]);
  });

  it('appends to an existing body instead of replacing it', () => {
    const withBody: Alert = { ...simulationAlert, details: { ...simulationAlert.details, body: ['existing'] } };

    expect(mergeAlerts(withBody, validationAlert)?.details.body).toEqual([
      'existing',
      'Warning: Verify Message Content: This message contains non-standard elements.',
    ]);
  });
});
