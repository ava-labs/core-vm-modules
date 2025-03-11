import { parseRequestParams } from './schema';

describe('src/handlers/sign-transaction/schema', () => {
  it('successfully parses valid params', () => {
    const validParams = [{ account: 'testAccount', serializedTx: 'dGVzdFR4' }];
    const result = parseRequestParams(validParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validParams);
    }
  });

  it('fails to parse invalid params', () => {
    const invalidParams = [{ account: 'testAccount', serializedTx: 'invalidBase64' }];
    const result = parseRequestParams(invalidParams);
    expect(result.success).toBe(false);
  });

  it('fails to parse params with missing fields', () => {
    const missingFieldsParams = [{ account: 'testAccount' }];
    const result = parseRequestParams(missingFieldsParams);
    expect(result.success).toBe(false);
  });
});
