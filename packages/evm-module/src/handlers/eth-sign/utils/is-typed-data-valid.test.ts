import { isTypedDataValid, isTypedDataV1Valid } from './is-typed-data-valid';

const validData = {
  types: {
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
  },
  primaryType: 'Permit',
  domain: {
    name: 'Dai Stablecoin',
    version: '1',
    chainId: 1,
    verifyingContract: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  message: {
    holder: '0x19E7E376E7C213B7E7E7E46CC70A5DD086DAFF2A',
    spender: '0x1111111111111111111111111111111111111111',
    nonce: '0',
    expiry: '9999999999',
    allowed: true,
  },
};

describe('isTypedDataValid', () => {
  it('returns valid for well-formed typed data', () => {
    expect(isTypedDataValid(validData)).toEqual({ isValid: true });
  });

  it('returns a blocking error when a bool field is supplied as a string (82203)', () => {
    const result = isTypedDataValid({
      ...validData,
      message: { ...validData.message, allowed: 'false' },
    });

    if (result.isValid) throw new Error('expected isValid to be false');
    expect(result.blocking).toBe(true);
  });

  it('returns a non-blocking error for ethers-level issues like an empty verifyingContract', () => {
    const result = isTypedDataValid({
      ...validData,
      domain: { ...validData.domain, verifyingContract: '' },
    });

    if (result.isValid) throw new Error('expected isValid to be false');
    expect(result.blocking).toBe(false);
  });
});

describe('isTypedDataV1Valid', () => {
  it('returns valid for well-formed V1 typed data', () => {
    expect(
      isTypedDataV1Valid([
        { name: 'allowed', type: 'bool', value: true },
        { name: 'nonce', type: 'uint256', value: '0' },
      ]),
    ).toEqual({ isValid: true });
  });

  it('returns a blocking error when a bool field is supplied as a string', () => {
    const result = isTypedDataV1Valid([{ name: 'allowed', type: 'bool', value: 'false' }]);

    if (result.isValid) throw new Error('expected isValid to be false');
    expect(result.blocking).toBe(true);
  });
});
