import { VsCurrencyType } from '@avalabs/coingecko-sdk';
import { TokenService } from '../utils/token-service/token-service';

const MOCK_DATA = { ethereum: { usd: { change24: 1, marketCap: 1, price: 1, vol24: 1 } } };

jest.mock('@avalabs/coingecko-sdk', () => ({
  ...jest.requireActual('@avalabs/coingecko-sdk'),
  simplePrice: () => {
    return MOCK_DATA;
  },
  simpleTokenPrice: () => {
    return MOCK_DATA;
  },
}));

const mockGet = jest.fn();
const MOCK_STORAGE = {
  get: mockGet,
  set: jest.fn(),
};

describe('token-service', () => {
  it('should get simple price', async () => {
    const tokenService = new TokenService({ proxyApiUrl: 'https://api.com/api/v3' });
    const data = await tokenService.getSimplePrice({
      coinIds: ['ethereum'],
      currencies: [VsCurrencyType.USD],
    });
    expect(data).toEqual({
      ethereum: {
        usd: {
          change24: 1,
          marketCap: 1,
          price: 1,
          vol24: 1,
        },
      },
    });
  });

  it('should get simple price from storage', async () => {
    const tokenService = new TokenService({ proxyApiUrl: 'https://api.com/api/v3', storage: MOCK_STORAGE });
    mockGet.mockReturnValue(MOCK_DATA);
    await tokenService.getSimplePrice({
      coinIds: ['ethereum'],
      currencies: [VsCurrencyType.USD],
    });
    expect(MOCK_STORAGE.get).toHaveLastReturnedWith(MOCK_DATA);
    expect(MOCK_STORAGE.set).toHaveBeenCalledTimes(0);
  });

  it('should get price by addresses', async () => {
    const tokenService = new TokenService({ proxyApiUrl: 'https://api.com/api/v3' });
    const data = await tokenService.getPricesByAddresses(['0x123'], 'ethereum', VsCurrencyType.USD);
    expect(data).toEqual({
      ethereum: {
        usd: {
          change24: 1,
          marketCap: 1,
          price: 1,
          vol24: 1,
        },
      },
    });
  });

  it('should get price by addresses from storage', async () => {
    const tokenService = new TokenService({ proxyApiUrl: 'https://api.com/api/v3', storage: MOCK_STORAGE });
    mockGet.mockReturnValue(MOCK_DATA);
    await tokenService.getPricesByAddresses(['0x123'], 'ethereum', VsCurrencyType.USD);
    expect(MOCK_STORAGE.get).toHaveLastReturnedWith(MOCK_DATA);
    expect(MOCK_STORAGE.set).toHaveBeenCalledTimes(0);
  });
});
