import { fetchAndVerify } from '@internal/utils/src/utils/fetch-and-verify';
import { MoralisService } from './moralis-service';

jest.mock('@internal/utils/src/utils/fetch-and-verify');

describe('MoralisService', () => {
  const proxyApiUrl = 'https://proxy.api.url';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retries errors and eventually returns portfolio', async () => {
    const service = new MoralisService({ proxyApiUrl });
    const mockedFetchAndVerify = jest.mocked(fetchAndVerify);

    mockedFetchAndVerify
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({ nativeBalance: { lamports: '1' }, tokens: [] } as never);

    const result = await service.getPortfolio({
      address: 'address1',
      network: 'mainnet',
    });

    expect(mockedFetchAndVerify).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      address: 'address1',
      portfolio: { nativeBalance: { lamports: '1' }, tokens: [] },
    });
  });
});
