import { parseRequestParams, type BitcoinSendTransactionParams } from './schema';

describe('parseRequestParams', () => {
  it('should parse valid parameters correctly', () => {
    const validParams: BitcoinSendTransactionParams = {
      from: 'senderAddress',
      to: 'receiverAddress',
      amount: 10,
      feeRate: 4,
    };

    const result = parseRequestParams(validParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validParams);
    }
  });

  it('should return an error for missing "from" field', () => {
    const invalidParams = {
      to: 'receiverAddress',
      amount: 10,
      feeRate: 4,
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]!.message).toBe('Required');
      expect(result.error.errors[0]!.path).toEqual(['from']);
    }
  });

  it('should return an error for missing "to" field', () => {
    const invalidParams = {
      from: 'senderAddress',
      amount: 10,
      feeRate: 4,
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]!.message).toBe('Required');
      expect(result.error.errors[0]!.path).toEqual(['to']);
    }
  });

  it('should return an error for missing "amount" field', () => {
    const invalidParams = {
      from: 'senderAddress',
      to: 'receiverAddress',
      feeRate: 4,
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]!.message).toBe('Required');
      expect(result.error.errors[0]!.path).toEqual(['amount']);
    }
  });

  it('should return an error for missing "feeRate" field', () => {
    const invalidParams = {
      from: 'senderAddress',
      to: 'receiverAddress',
      amount: 10,
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]!.message).toBe('Required');
      expect(result.error.errors[0]!.path).toEqual(['feeRate']);
    }
  });

  it('should return an error for invalid "amount" type', () => {
    const invalidParams = {
      from: 'senderAddress',
      to: 'receiverAddress',
      amount: '10',
      feeRate: 4,
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]!.message).toBe('Expected number, received string');
      expect(result.error.errors[0]!.path).toEqual(['amount']);
    }
  });

  it('should return an error for invalid "feeRate" type', () => {
    const invalidParams = {
      from: 'senderAddress',
      to: 'receiverAddress',
      amount: 10,
      feeRate: '4',
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]!.message).toBe('Expected number, received string');
      expect(result.error.errors[0]!.path).toEqual(['feeRate']);
    }
  });
});
