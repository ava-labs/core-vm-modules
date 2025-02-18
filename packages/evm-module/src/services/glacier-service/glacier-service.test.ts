import { EvmGlacierService } from '@src/services/glacier-service/glacier-service';
import { type ChainInfo, EvmChainsService, Glacier } from '@avalabs/glacier-sdk';
import { ChainId } from '@avalabs/core-chains-sdk';

jest.mock('@avalabs/glacier-sdk', () => ({
  Glacier: jest.fn(),
}));

describe('GlacierService', () => {
  let glacierService: EvmGlacierService;
  let mockGlacier: jest.Mocked<Glacier>;
  const FAKE_URL = 'http://fake-url';

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    mockGlacier = {
      evmChains: {
        supportedChains: jest.fn(),
      } as unknown as jest.Mocked<EvmChainsService>,
    };
    (Glacier as jest.Mock).mockReturnValue(mockGlacier);

    glacierService = new EvmGlacierService({ glacierApiUrl: FAKE_URL });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isNetworkSupported', () => {
    it('Should return false if Ethereum main chain ID is passed in', async () => {
      (mockGlacier.evmChains as jest.Mocked<EvmChainsService>).supportedChains.mockResolvedValue({
        chains: [{ chainId: '1' } as ChainInfo, { chainId: '2' } as ChainInfo],
      });

      const result = await glacierService.isNetworkSupported(ChainId.ETHEREUM_HOMESTEAD);

      expect(result).toBe(false);
    });

    it('Should return true if anything other than Ethereum main chain ID is passed in', async () => {
      (mockGlacier.evmChains as jest.Mocked<EvmChainsService>).supportedChains.mockResolvedValue({
        chains: [{ chainId: '1' } as ChainInfo, { chainId: '43114' } as ChainInfo],
      });

      const result = await glacierService.isNetworkSupported(ChainId.AVALANCHE_MAINNET_ID);

      expect(result).toBe(true);
    });
  });
});
