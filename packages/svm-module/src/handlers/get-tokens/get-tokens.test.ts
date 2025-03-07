import { getTokens } from './get-tokens';
import { fetchAndVerify } from '@internal/utils/src/utils/fetch-and-verify';
import { rpcErrors } from '@metamask/rpc-errors';
import { SPL_TOKENS_SCHEMA } from './spl-token-schema';

jest.mock('@internal/utils/src/utils/fetch-and-verify');
jest.mock('@metamask/rpc-errors', () => ({
  rpcErrors: {
    internal: jest.fn((message) => new Error(message)),
  },
}));

describe('src/handlers/get-tokens', () => {
  const caip2Id = 'test-caip2Id';
  const proxyApiUrl = 'https://api.test.com';
  const mockTokens = [{ token: 'token1' }, { token: 'token2' }];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and return tokens successfully', async () => {
    (fetchAndVerify as jest.Mock).mockResolvedValue(mockTokens);

    const result = await getTokens({ caip2Id, proxyApiUrl });

    expect(fetchAndVerify).toHaveBeenCalledWith([`${proxyApiUrl}/solana-tokens?caip2Id=${caip2Id}`], SPL_TOKENS_SCHEMA);
    expect(result).toEqual(mockTokens);
  });

  it('should throw an internal error if fetchAndVerify fails', async () => {
    const errorMessage = 'Failed to fetch';
    (fetchAndVerify as jest.Mock).mockRejectedValue(new Error(errorMessage));

    await expect(getTokens({ caip2Id, proxyApiUrl })).rejects.toThrow(
      `Failed to fetch tokens for caip2Id "${caip2Id}"`,
    );
    expect(rpcErrors.internal).toHaveBeenCalledWith(`Failed to fetch tokens for caip2Id "${caip2Id}"`);
  });
});
