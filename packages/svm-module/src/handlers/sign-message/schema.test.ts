import { parseRequestParams } from './schema';

describe('src/handlers/sign-message/schema', () => {
  it('successfully parses valid params', () => {
    const validParams = [{ account: 'testAccount', serializedMessage: 'SGVsbG8gdGhlcmU=' }]; // "Hello there" in base64
    const result = parseRequestParams(validParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validParams);
    }
  });

  it('fails to parse invalid params', () => {
    const invalidParams = [{ account: 'testAccount', serializedMessage: 'invalidBase64' }];
    const result = parseRequestParams(invalidParams);
    expect(result.success).toBe(false);
  });

  it('fails to parse params with missing fields', () => {
    const missingFieldsParams = [{ account: 'testAccount' }];
    const result = parseRequestParams(missingFieldsParams);
    expect(result.success).toBe(false);
  });

  it('forbids passing transaction bytes', () => {
    // This would send 0.001 SOL
    const encodedTxBytes =
      'gAEAAQNPAVKo0doHY8oS/vZ018d8Fd7uABsPsU4d9a8tA3Hb0QqEpfYzPGQw9mpl1Xxbk6uIEt604LAGkj/XmZyITucxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsdqW9XERUw+73+mjQFregnod5ljulod+8/5B1hbHJdgECAgABDAIAAACAlpgAAAAAAAA=';
    const transactionBytesParams = [{ account: 'testAccount', serializedMessage: encodedTxBytes }];

    const result = parseRequestParams(transactionBytesParams);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({ message: 'Cannot use signMessage() calls for signing transactions' }),
    );
  });
});
