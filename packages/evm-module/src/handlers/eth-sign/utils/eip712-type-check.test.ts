import { findEip712TypeMismatches, findEip712V1TypeMismatches } from './eip712-type-check';

const baseTypes = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Permit: [
    { name: 'holder', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'allowed', type: 'bool' },
  ],
};

const baseDomain = {
  name: 'Dai Stablecoin',
  version: '1',
  chainId: 1,
  verifyingContract: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
};

const baseMessage = {
  holder: '0x19E7E376E7C213B7E7E7E46CC70A5DD086DAFF2A',
  spender: '0x1111111111111111111111111111111111111111',
  nonce: '0',
  expiry: '9999999999',
  allowed: true,
};

describe('findEip712TypeMismatches', () => {
  it('reports no mismatches for a well-formed DAI-style Permit', () => {
    const result = findEip712TypeMismatches({
      types: baseTypes,
      primaryType: 'Permit',
      domain: baseDomain,
      message: baseMessage,
    });

    expect(result).toEqual([]);
  });

  it('flags the string "false" for a bool field (82203)', () => {
    const result = findEip712TypeMismatches({
      types: baseTypes,
      primaryType: 'Permit',
      domain: baseDomain,
      message: { ...baseMessage, allowed: 'false' },
    });

    expect(result).toEqual([expect.stringContaining('message.allowed')]);
  });

  it('flags the string "true" for a bool field too', () => {
    const result = findEip712TypeMismatches({
      types: baseTypes,
      primaryType: 'Permit',
      domain: baseDomain,
      message: { ...baseMessage, allowed: 'true' },
    });

    expect(result).toEqual([expect.stringContaining('message.allowed')]);
  });

  it('flags a non-canonical decimal string for a uint256 field', () => {
    const result = findEip712TypeMismatches({
      types: baseTypes,
      primaryType: 'Permit',
      domain: baseDomain,
      message: { ...baseMessage, nonce: '1.5' },
    });

    expect(result).toEqual([expect.stringContaining('message.nonce')]);
  });

  it('flags the noncanonical fixed-point string from 82199', () => {
    const result = findEip712TypeMismatches({
      types: {
        EIP712Domain: baseTypes.EIP712Domain,
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'Permit',
      domain: baseDomain,
      message: {
        owner: baseMessage.holder,
        spender: baseMessage.spender,
        value: '1.500000000000000000',
        nonce: '0',
        deadline: '9999999999',
      },
    });

    expect(result).toEqual([expect.stringContaining('message.value')]);
  });

  it('accepts a hex string for a uint256 field', () => {
    const result = findEip712TypeMismatches({
      types: baseTypes,
      primaryType: 'Permit',
      domain: baseDomain,
      message: { ...baseMessage, nonce: '0x0' },
    });

    expect(result).toEqual([]);
  });

  it('flags a short/malformed address', () => {
    const result = findEip712TypeMismatches({
      types: baseTypes,
      primaryType: 'Permit',
      domain: baseDomain,
      message: { ...baseMessage, spender: '0x1111' },
    });

    expect(result).toEqual([expect.stringContaining('message.spender')]);
  });

  it('does not flag a malformed domain field (compatibility is preserved for domain)', () => {
    const result = findEip712TypeMismatches({
      types: baseTypes,
      primaryType: 'Permit',
      domain: { ...baseDomain, verifyingContract: '' },
      message: baseMessage,
    });

    expect(result).toEqual([]);
  });

  it('recurses into nested struct fields', () => {
    const types = {
      ...baseTypes,
      Order: [
        { name: 'permit', type: 'Permit' },
        { name: 'salt', type: 'uint256' },
      ],
    };

    const result = findEip712TypeMismatches({
      types,
      primaryType: 'Order',
      domain: baseDomain,
      message: {
        salt: '1',
        permit: { ...baseMessage, allowed: 'false' },
      },
    });

    expect(result).toEqual([expect.stringContaining('message.permit.allowed')]);
  });

  it('recurses into array fields', () => {
    const types = {
      ...baseTypes,
      Batch: [{ name: 'permits', type: 'Permit[]' }],
    };

    const result = findEip712TypeMismatches({
      types,
      primaryType: 'Batch',
      domain: baseDomain,
      message: {
        permits: [baseMessage, { ...baseMessage, allowed: 'false' }],
      },
    });

    expect(result).toEqual([expect.stringContaining('message.permits[1].allowed')]);
  });

  it('does not flag string types regardless of content', () => {
    const types = {
      EIP712Domain: baseTypes.EIP712Domain,
      Mail: [{ name: 'contents', type: 'string' }],
    };

    const result = findEip712TypeMismatches({
      types,
      primaryType: 'Mail',
      domain: baseDomain,
      message: { contents: 'hello' },
    });

    expect(result).toEqual([]);
  });
});

describe('findEip712V1TypeMismatches', () => {
  it('reports no mismatches for well-formed V1 typed data', () => {
    const result = findEip712V1TypeMismatches([
      { name: 'holder', type: 'address', value: baseMessage.holder },
      { name: 'allowed', type: 'bool', value: true },
    ]);

    expect(result).toEqual([]);
  });

  it('flags the string "false" for a bool field', () => {
    const result = findEip712V1TypeMismatches([{ name: 'allowed', type: 'bool', value: 'false' }]);

    expect(result).toEqual([expect.stringContaining('allowed')]);
  });

  it('flags a non-canonical decimal string for a uint256 field', () => {
    const result = findEip712V1TypeMismatches([{ name: 'value', type: 'uint256', value: '1.5' }]);

    expect(result).toEqual([expect.stringContaining('value')]);
  });
});
