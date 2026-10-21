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

const chainAgnosticData = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
    ],
    ToSAcceptance: [
      { name: 'statement', type: 'string' },
      { name: 'wallet', type: 'address' },
    ],
  },
  primaryType: 'ToSAcceptance',
  domain: { name: 'BENQI Terms of Service', version: '1' },
  message: {
    statement: 'By signing this message, you confirm that you have read and agree to the BENQI Terms of Service.',
    wallet: '0x05bcd07a055a950183d0b0cd88caa579fe58d2ea',
  },
};

// Hyperliquid fixes these domain values in its user-signed and L1 Agent signing protocols.
const hyperliquidUserSignedData = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    'HyperliquidTransaction:ApproveAgent': [{ name: 'nonce', type: 'uint64' }],
  },
  primaryType: 'HyperliquidTransaction:ApproveAgent',
  domain: {
    name: 'HyperliquidSignTransaction',
    version: '1',
    chainId: '421614',
    verifyingContract: '0x0000000000000000000000000000000000000000',
  },
  message: { nonce: 1 },
};

const hyperliquidAgentData = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Agent: [
      { name: 'source', type: 'string' },
      { name: 'connectionId', type: 'bytes32' },
    ],
  },
  primaryType: 'Agent',
  domain: {
    name: 'Exchange',
    version: '1',
    chainId: '1337',
    verifyingContract: '0x0000000000000000000000000000000000000000',
  },
  message: {
    source: 'a',
    connectionId: `0x${'00'.repeat(32)}`,
  },
};

describe('isTypedDataValid', () => {
  it('returns valid for well-formed typed data', () => {
    expect(isTypedDataValid(validData, 1)).toEqual({ isValid: true });
  });

  it('returns a blocking error when a bool field is supplied as a string (82203)', () => {
    const result = isTypedDataValid(
      {
        ...validData,
        message: { ...validData.message, allowed: 'false' },
      },
      1,
    );

    if (result.isValid) throw new Error('expected isValid to be false');
    expect(result.blocking).toBe(true);
  });

  it('returns a non-blocking error for ethers-level issues like an empty verifyingContract', () => {
    const result = isTypedDataValid(
      {
        ...validData,
        domain: { ...validData.domain, verifyingContract: '' },
      },
      1,
    );

    if (result.isValid) throw new Error('expected isValid to be false');
    expect(result.blocking).toBe(false);
  });

  describe('domain chainId', () => {
    it.each([1, '1', '0x1'])('accepts a domain chainId of %p that matches the requested network', (chainId) => {
      expect(isTypedDataValid({ ...validData, domain: { ...validData.domain, chainId } }, 1)).toEqual({
        isValid: true,
      });
    });

    it.each([43114, '43114', '0xa86a', 'not-a-chain-id', 1.5, true, [1], {}])(
      'returns a blocking error when the domain chainId is %p and the requested network is 1',
      (chainId) => {
        const result = isTypedDataValid({ ...validData, domain: { ...validData.domain, chainId } }, 1);

        if (result.isValid) throw new Error('expected isValid to be false');
        expect(result.blocking).toBe(true);
        expect(String(result.error)).toContain('does not match the requested network (1)');
        expect(String(result.error)).toContain(`chainId (${JSON.stringify(chainId)})`);
      },
    );

    it('accepts a domain without a chainId, since every EIP-712 domain field is optional', () => {
      expect(isTypedDataValid(chainAgnosticData, 43114)).toEqual({ isValid: true });
    });

    it.each([undefined, null])('treats a %p domain chainId as absent', (chainId) => {
      expect(
        isTypedDataValid({ ...chainAgnosticData, domain: { ...chainAgnosticData.domain, chainId } }, 43114),
      ).toEqual({ isValid: true });
    });

    it.each([
      ['user-signed', hyperliquidUserSignedData],
      ['L1 Agent', hyperliquidAgentData],
    ])('accepts the fixed Hyperliquid %s domain on another requested network', (_kind, data) => {
      expect(isTypedDataValid(data, 999)).toEqual({ isValid: true });
    });

    it('rejects a Hyperliquid-like domain with a different verifying contract', () => {
      const result = isTypedDataValid(
        {
          ...hyperliquidUserSignedData,
          domain: {
            ...hyperliquidUserSignedData.domain,
            verifyingContract: '0x1111111111111111111111111111111111111111',
          },
        },
        999,
      );

      if (result.isValid) throw new Error('expected isValid to be false');
      expect(result.blocking).toBe(true);
    });
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
