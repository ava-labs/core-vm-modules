import { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { FetchRequest } from 'ethers';
import { getProvider } from './get-provider';

jest.mock('@avalabs/core-wallets-sdk', () => ({
  JsonRpcBatchInternal: jest.fn().mockImplementation(() => ({})),
}));

const CORE_PROXY_RPC_URL = 'https://core-proxy-api.avax.network/v1/proxy/public-rpc/ext/bc/C/rpc';
const THIRD_PARTY_RPC_URL = 'https://rpc.example.com';

const baseParams = { chainId: 43114, chainName: 'Avalanche C-Chain' };

const getConnection = (): string | FetchRequest => {
  const connection = jest.mocked(JsonRpcBatchInternal).mock.calls.at(-1)?.[1];
  if (connection === undefined) {
    throw new Error('JsonRpcBatchInternal was not constructed');
  }
  return connection;
};

const runPreflight = async (connection: string | FetchRequest): Promise<FetchRequest> => {
  if (typeof connection === 'string' || !connection.preflightFunc) {
    throw new Error('Expected a FetchRequest with a preflight function');
  }
  return connection.preflightFunc(connection.clone());
};

describe('evm-module/utils/get-provider', () => {
  beforeEach(() => {
    jest.mocked(JsonRpcBatchInternal).mockClear();
  });

  it('passes the plain RPC URL when there is nothing to attach', async () => {
    await getProvider({ ...baseParams, rpcUrl: THIRD_PARTY_RPC_URL });

    expect(getConnection()).toBe(THIRD_PARTY_RPC_URL);
  });

  it('sets custom RPC headers', async () => {
    await getProvider({ ...baseParams, rpcUrl: THIRD_PARTY_RPC_URL, customRpcHeaders: { 'X-Custom': 'value' } });

    const connection = getConnection() as FetchRequest;
    expect(connection.getHeader('X-Custom')).toBe('value');
    expect(connection.preflightFunc).toBeNull();
  });

  it('attaches auth headers to every request to the Core proxy', async () => {
    const getAuthHeaders = jest
      .fn()
      .mockResolvedValueOnce({ 'X-Firebase-AppCheck': 'token-1' })
      .mockResolvedValueOnce({ 'X-Firebase-AppCheck': 'token-2' });

    await getProvider({ ...baseParams, rpcUrl: CORE_PROXY_RPC_URL, getAuthHeaders });
    const connection = getConnection();

    expect((await runPreflight(connection)).getHeader('X-Firebase-AppCheck')).toBe('token-1');
    expect((await runPreflight(connection)).getHeader('X-Firebase-AppCheck')).toBe('token-2');
    expect(getAuthHeaders).toHaveBeenCalledTimes(2);
  });

  it('keeps custom headers alongside the auth headers', async () => {
    const getAuthHeaders = jest.fn().mockResolvedValue({ 'X-Core-Api-Key': 'api-key' });

    await getProvider({
      ...baseParams,
      rpcUrl: CORE_PROXY_RPC_URL,
      customRpcHeaders: { 'X-Custom': 'value' },
      getAuthHeaders,
    });
    const request = await runPreflight(getConnection());

    expect(request.getHeader('X-Custom')).toBe('value');
    expect(request.getHeader('X-Core-Api-Key')).toBe('api-key');
  });

  it('tolerates a resolver that returns no headers', async () => {
    await getProvider({
      ...baseParams,
      rpcUrl: CORE_PROXY_RPC_URL,
      getAuthHeaders: jest.fn().mockResolvedValue(undefined),
    });

    await expect(runPreflight(getConnection())).resolves.toBeInstanceOf(FetchRequest);
  });

  it.each([THIRD_PARTY_RPC_URL, 'https://core-proxy-api.avax.network.evil.com/rpc', 'not a url'])(
    'never sends auth headers to %s',
    async (rpcUrl) => {
      const getAuthHeaders = jest.fn();

      await getProvider({ ...baseParams, rpcUrl, getAuthHeaders });

      expect(getConnection()).toBe(rpcUrl);
      expect(getAuthHeaders).not.toHaveBeenCalled();
    },
  );
});
