import { parseRequestParams, type AvalancheSendTransactionParams } from './schema';

describe('parseRequestParams', () => {
  it('should parse valid parameters correctly', () => {
    const validParams: AvalancheSendTransactionParams = {
      transactionHex: 'transactionHex',
      chainAlias: 'X',
      externalIndices: [0, 1],
      internalIndices: [2, 3],
      utxos: ['utxo1', 'utxo2'],
    };

    const result = parseRequestParams(validParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validParams);
    }
  });

  it('should return an error for missing "transactionHex" field', () => {
    const invalidParams = {
      chainAlias: 'X',
      externalIndices: [0, 1],
      internalIndices: [2, 3],
      utxos: ['utxo1', 'utxo2'],
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]!.message).toBe('Required');
      expect(result.error.errors[0]!.path).toEqual(['transactionHex']);
    }
  });

  it('should return an error for missing "chainAlias" field', () => {
    const invalidParams = {
      transactionHex: 'transactionHex',
      externalIndices: [0, 1],
      internalIndices: [2, 3],
      utxos: ['utxo1', 'utxo2'],
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]!.message).toBe('Required');
      expect(result.error.errors[0]!.path).toEqual(['chainAlias']);
    }
  });

  it('should return an error for invalid "externalIndices" type', () => {
    const invalidParams = {
      transactionHex: 'transactionHex',
      chainAlias: 'X',
      externalIndices: ['0', 1],
      internalIndices: [2, 3],
      utxos: ['utxo1', 'utxo2'],
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]!.message).toBe('Expected number, received string');
      expect(result.error.errors[0]!.path).toEqual(['externalIndices', 0]);
    }
  });

  it('should return an error for invalid "internalIndices" type', () => {
    const invalidParams = {
      transactionHex: 'transactionHex',
      chainAlias: 'X',
      externalIndices: [0, 1],
      internalIndices: ['2', 3],
      utxos: ['utxo1', 'utxo2'],
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]!.message).toBe('Expected number, received string');
      expect(result.error.errors[0]!.path).toEqual(['internalIndices', 0]);
    }
  });

  it('should return an error for invalid "utxos" type', () => {
    const invalidParams = {
      transactionHex: 'transactionHex',
      chainAlias: 'X',
      externalIndices: [0, 1],
      internalIndices: [2, 3],
      utxos: [1, 'utxo2'],
    };

    const result = parseRequestParams(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]!.message).toBe('Expected string, received number');
      expect(result.error.errors[0]!.path).toEqual(['utxos', 0]);
    }
  });
});
