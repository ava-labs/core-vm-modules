import { parseRequestParams } from './schema';

describe('src/handlers/sign-and-send-transaction/schema', () => {
  it('parses valid parameters', () => {
    const validParams = [
      {
        account: 'testAccount',
        serializedTx: 'dGVzdFR4', // base64 for 'testTx'
        sendOptions: {
          preflightCommitment: 'confirmed',
          maxRetries: BigInt(3),
          minContextSlot: BigInt(1),
          skipPreflight: true,
        },
      },
    ];

    const result = parseRequestParams(validParams);
    expect(result.success).toBe(true);
  });

  it('fails to parse invalid parameters', () => {
    const invalidParams = [
      {
        account: 'testAccount',
        serializedTx: 'invalidBase64',
        sendOptions: {
          preflightCommitment: 'invalidCommitment',
          maxRetries: 'notABigInt',
          minContextSlot: 'notABigInt',
          skipPreflight: 'notABoolean',
        },
      },
    ];

    const result = parseRequestParams(invalidParams);
    expect(result.success).toBe(false);
  });

  it('allows missing optional fields', () => {
    const paramsWithMissingOptionalFields = [
      {
        account: 'testAccount',
        serializedTx: 'dGVzdFR4', // base64 for 'testTx'
      },
    ];

    const result = parseRequestParams(paramsWithMissingOptionalFields);
    expect(result.success).toBe(true);
  });

  it('fails when required fields are missing', () => {
    const paramsWithMissingRequiredFields = [
      {
        serializedTx: 'dGVzdFR4', // base64 for 'testTx'
      },
    ];

    const result = parseRequestParams(paramsWithMissingRequiredFields);
    expect(result.success).toBe(false);
  });
});
