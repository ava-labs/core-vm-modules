import { getNodeChainId, parseRequestChainId } from './get-node-chain-id';

// '3QGVg754' is the cb58 encoding of the bytes 0x04d2, i.e. 1234.
const CB58_CHAIN_ID = '3QGVg754';

describe('getNodeChainId', () => {
  const network = { rpcUrl: 'https://rpc.example', chainName: 'example' };
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  it('asks the node for its network info and returns the chain id as an integer', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ result: { chainId: CB58_CHAIN_ID } }) });

    await expect(getNodeChainId(network)).resolves.toBe(1234n);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://rpc.example/ext/bc/example/coreapi',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('hypersdk.network'),
      }),
    );
  });

  it('throws when the node returns an error', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ error: { message: 'no such chain' } }) });

    await expect(getNodeChainId(network)).rejects.toThrow('no such chain');
  });

  it('throws when the node returns no chain id', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ result: {} }) });

    await expect(getNodeChainId(network)).rejects.toThrow('did not return a chain id');
  });
});

describe('parseRequestChainId', () => {
  it('accepts the decimal form used in transaction payloads', () => {
    expect(parseRequestChainId('1234')).toBe(1234n);
  });

  it('accepts the cb58 form the node itself reports', () => {
    expect(parseRequestChainId(CB58_CHAIN_ID)).toBe(1234n);
  });

  it('returns null for values that are neither form', () => {
    // '0' and 'l' are not part of the base58 alphabet.
    expect(parseRequestChainId('0l0l')).toBeNull();
    expect(parseRequestChainId('')).toBeNull();
  });

  it('does not treat a decodable-but-wrong id as a match', () => {
    // cb58 decoding does not verify the trailing checksum, so an arbitrary base58 string
    // still decodes - it just decodes to a different number than the node reports.
    expect(parseRequestChainId('hvm1234')).not.toBe(1234n);
  });
});
