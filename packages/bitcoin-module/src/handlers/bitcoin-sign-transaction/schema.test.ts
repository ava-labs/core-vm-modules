import { parseRequestParams, type BitcoinSignTransactionParams } from './schema';

describe('bitcoin-sign-transaction / parseRequestParams', () => {
  it('should parse valid parameters correctly', () => {
    const validParams: BitcoinSignTransactionParams = {
      inputs: [
        {
          txHash: 'fec5120f24bb57ad43c486053ad44d474e5fac545919db6558a5a827e62bbeb0',
          index: 1,
          value: 1_000_000,
          script: '00148a8750a949264dc33f6f40cff49c45ccd7b170f0',
          blockHeight: 3009678,
          confirmations: 93133,
        },
      ],
      outputs: [
        {
          address: 'recipient-address',
          value: 900_000,
        },
      ],
    };

    const result = parseRequestParams(validParams);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(validParams);
  });

  it('should return an error for missing "script" fields', () => {
    const invalidParams = {
      inputs: [
        {
          txHash: 'fec5120f24bb57ad43c486053ad44d474e5fac545919db6558a5a827e62bbeb0',
          index: 1,
          value: 1_000_000,
          script: '',
          blockHeight: 3009678,
          confirmations: 93133,
        },
      ],
      outputs: [
        {
          address: 'recipient-address',
          value: 900_000,
        },
      ],
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    expect(result.error!.errors[0]!.message).toBe('String must contain at least 1 character(s)');
    expect(result.error!.errors[0]!.path).toEqual(['inputs', 0, 'script']);
  });

  it('should return an error for missing "txHash" field', () => {
    const invalidParams = {
      inputs: [
        {
          index: 1,
          value: 1_000_000,
          script: '00148a8750a949264dc33f6f40cff49c45ccd7b170f0',
          blockHeight: 3009678,
          confirmations: 93133,
        },
      ],
      outputs: [
        {
          address: 'recipient-address',
          value: 900_000,
        },
      ],
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    expect(result.error!.errors[0]!.message).toBe('Required');
    expect(result.error!.errors[0]!.path).toEqual(['inputs', 0, 'txHash']);
  });

  it('should return an error for missing "index" field', () => {
    const invalidParams = {
      inputs: [
        {
          txHash: 'fec5120f24bb57ad43c486053ad44d474e5fac545919db6558a5a827e62bbeb0',
          value: 1_000_000,
          script: '00148a8750a949264dc33f6f40cff49c45ccd7b170f0',
          blockHeight: 3009678,
          confirmations: 93133,
        },
      ],
      outputs: [
        {
          address: 'recipient-address',
          value: 900_000,
        },
      ],
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    expect(result.error!.errors[0]!.message).toBe('Required');
    expect(result.error!.errors[0]!.path).toEqual(['inputs', 0, 'index']);
  });

  it('should return error for missing inputs', () => {
    const params = {
      inputs: [],
      outputs: [
        {
          address: 'recipient-address',
          value: 900_000,
        },
      ],
    };

    const result = parseRequestParams(params);

    expect(result.success).toBe(false);
    expect(result.error!.errors[0]!.message).toEqual('Array must contain at least 1 element(s)');
    expect(result.error!.errors[0]!.path).toEqual(['inputs']);
  });

  it('should return error for missing outputs', () => {
    const params = {
      inputs: [
        {
          index: 1,
          txHash: 'fec5120f24bb57ad43c486053ad44d474e5fac545919db6558a5a827e62bbeb0',
          value: 1_000_000,
          script: '00148a8750a949264dc33f6f40cff49c45ccd7b170f0',
          blockHeight: 3009678,
          confirmations: 93133,
        },
      ],
      outputs: [],
    };

    const result = parseRequestParams(params);

    expect(result.success).toBe(false);
    expect(result.error!.errors[0]!.message).toEqual('Array must contain at least 1 element(s)');
    expect(result.error!.errors[0]!.path).toEqual(['outputs']);
  });
});
