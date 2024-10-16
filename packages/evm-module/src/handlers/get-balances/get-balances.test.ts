import { EvmGlacierService } from '../../services/glacier-service/glacier-service';
import { findAsync } from '../../utils/find-async';
import { getBalances } from './get-balances';
import {
  Environment,
  type Network,
  type NetworkContractToken,
  type NetworkTokenWithBalance,
  NetworkVMType,
  type NftTokenWithBalance,
  TokenType,
  type TokenWithBalanceEVM,
} from '@avalabs/vm-module-types';
import { getTokens } from '../get-tokens/get-tokens';
import { TokenService } from '@internal/utils';
import { getEnv } from '../../env';
import { getProvider } from '../../utils/get-provider';
import { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { RpcService } from '../../services/rpc-service/rpc-service';
import { DeBankService } from '../../services/debank-service/debank-service';

jest.mock('../../utils/find-async');
jest.mock('../../utils/get-provider');
jest.mock('../../services/debank-service/debank-service');
jest.mock('../../services/glacier-service/glacier-service');
jest.mock('../../services/rpc-service/rpc-service');
jest.mock('../get-tokens/get-tokens');
jest.mock('@internal/utils');

describe('getBalances', () => {
  const { proxyApiUrl } = getEnv(Environment.DEV);
  const glacierService = new EvmGlacierService({ glacierApiUrl: proxyApiUrl }) as jest.Mocked<EvmGlacierService>;
  const deBankService = new DeBankService({ proxyApiUrl }) as jest.Mocked<DeBankService>;
  const network = {
    chainId: 1,
    chainName: 'Ethereum',
    rpcUrl: 'https://mainnet.infura.io',
    utilityAddresses: { multicall: '0x...' },
    vmName: NetworkVMType.EVM,
  } as Network;
  const addresses = ['0xAddress1', '0xAddress2'];
  const currency = 'usd';
  const customTokens = [{ address: '0xToken1', symbol: 'TOKEN1' } as NetworkContractToken];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve balances successfully when a supporting service is found', async () => {
    const mockFindAsync = findAsync as jest.MockedFunction<typeof findAsync>;
    mockFindAsync.mockResolvedValue(glacierService);
    glacierService.isNetworkSupported.mockResolvedValue(true);
    glacierService.getNativeBalance.mockResolvedValue({ symbol: 'ETH' } as NetworkTokenWithBalance);
    glacierService.listErc20Balances.mockResolvedValue({
      '0xTokenId1': { symbol: 'TOKEN1' } as TokenWithBalanceEVM,
    });
    glacierService.listNftBalances.mockResolvedValue({
      '0xnft': { type: TokenType.ERC721, address: '0xnft' } as NftTokenWithBalance,
    });

    const result = await getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl,
      customTokens,
      balanceServices: [glacierService, deBankService],
    });

    expect(result).toEqual({
      '0xAddress1': {
        ETH: { symbol: 'ETH' },
        '0xTokenId1': { symbol: 'TOKEN1' },
        '0xnft': { type: TokenType.ERC721, address: '0xnft' },
      },
      '0xAddress2': {
        ETH: { symbol: 'ETH' },
        '0xTokenId1': { symbol: 'TOKEN1' },
        '0xnft': { type: TokenType.ERC721, address: '0xnft' },
      },
    });
  });

  it('should retrieve balances successfully when no supporting service is found', async () => {
    const mockedRpcService = new RpcService({
      customTokens: [],
      network: {} as Network,
      proxyApiUrl: '',
    }) as jest.Mocked<RpcService>;
    const mockFindAsync = findAsync as jest.MockedFunction<typeof findAsync>;
    mockFindAsync.mockResolvedValue(mockedRpcService);
    glacierService.isNetworkSupported.mockResolvedValue(false);
    deBankService.isNetworkSupported.mockResolvedValue(false);
    const mockGetProvider = getProvider as jest.MockedFunction<typeof getProvider>;
    mockGetProvider.mockResolvedValue({} as JsonRpcBatchInternal);
    (getTokens as jest.MockedFunction<typeof getTokens>).mockResolvedValue([]);
    mockedRpcService.getNativeBalance.mockResolvedValue({
      symbol: 'ETH',
    } as NetworkTokenWithBalance);
    mockedRpcService.listErc20Balances.mockResolvedValue({
      '0xTokenId1': { symbol: 'TOKEN1' } as TokenWithBalanceEVM,
    });
    mockedRpcService.listNftBalances.mockResolvedValue({});
    const tokenService = new TokenService({ proxyApiUrl }) as jest.Mocked<TokenService>;
    tokenService.getPricesByAddresses.mockResolvedValue(undefined);

    const result = await getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl,
      customTokens,
      balanceServices: [glacierService, deBankService],
    });

    expect(result).toEqual({
      '0xAddress1': { ETH: { symbol: 'ETH' }, '0xTokenId1': { symbol: 'TOKEN1' } },
      '0xAddress2': { ETH: { symbol: 'ETH' }, '0xTokenId1': { symbol: 'TOKEN1' } },
    });
  });

  it('should handle errors during balance retrieval', async () => {
    const mockFindAsync = findAsync as jest.MockedFunction<typeof findAsync>;
    mockFindAsync.mockResolvedValue(glacierService);
    glacierService.isNetworkSupported.mockResolvedValue(true);
    glacierService.getNativeBalance.mockRejectedValue(new Error('Failed to get native balance'));
    glacierService.listErc20Balances.mockRejectedValue(new Error('Failed to list ERC20 balances'));
    glacierService.listNftBalances.mockResolvedValue({});

    const result = await getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl,
      customTokens,
      balanceServices: [glacierService, deBankService],
    });

    expect(result).toEqual({
      '0xAddress1': {
        error: 'listErc20Balances failed: unknown error',
      },
      '0xAddress2': {
        error: 'listErc20Balances failed: unknown error',
      },
    });
  });

  describe('when tokenTypes array is not provided', () => {
    it('fetches all token types', async () => {
      const mockFindAsync = findAsync as jest.MockedFunction<typeof findAsync>;
      mockFindAsync.mockResolvedValue(glacierService);
      glacierService.isNetworkSupported.mockResolvedValue(true);
      glacierService.getNativeBalance.mockResolvedValue({ symbol: 'ETH' } as NetworkTokenWithBalance);
      glacierService.listErc20Balances.mockResolvedValue({
        '0xTokenId1': { symbol: 'TOKEN1' } as TokenWithBalanceEVM,
      });
      glacierService.listNftBalances.mockResolvedValue({
        '0xnft': { type: TokenType.ERC721, address: '0xnft' } as NftTokenWithBalance,
      });

      await getBalances({
        addresses,
        currency,
        network,
        proxyApiUrl,
        customTokens,
        balanceServices: [glacierService, deBankService],
      });

      expect(glacierService.getNativeBalance).toHaveBeenCalled();
      expect(glacierService.listErc20Balances).toHaveBeenCalled();
      expect(glacierService.listNftBalances).toHaveBeenCalled();
    });
  });

  describe('when tokenTypes array is provided', () => {
    beforeEach(() => {
      const mockFindAsync = findAsync as jest.MockedFunction<typeof findAsync>;
      mockFindAsync.mockResolvedValue(glacierService);
      glacierService.isNetworkSupported.mockResolvedValue(true);
      glacierService.getNativeBalance.mockResolvedValue({ symbol: 'ETH' } as NetworkTokenWithBalance);
      glacierService.listErc20Balances.mockResolvedValue({
        '0xTokenId1': { symbol: 'TOKEN1' } as TokenWithBalanceEVM,
      });
      glacierService.listNftBalances.mockResolvedValue({
        '0xnft': { type: TokenType.ERC721, address: '0xnft' } as NftTokenWithBalance,
      });
    });

    it('does not fetch NFTs if not explicitly asked', async () => {
      await getBalances({
        addresses,
        currency,
        network,
        proxyApiUrl,
        customTokens,
        balanceServices: [glacierService, deBankService],
        tokenTypes: [TokenType.NATIVE, TokenType.ERC20],
      });

      expect(glacierService.getNativeBalance).toHaveBeenCalled();
      expect(glacierService.listErc20Balances).toHaveBeenCalled();
      expect(glacierService.listNftBalances).not.toHaveBeenCalled();
    });

    it('does not fetch ERC-20 if not explicitly asked', async () => {
      await getBalances({
        addresses,
        currency,
        network,
        proxyApiUrl,
        customTokens,
        balanceServices: [glacierService, deBankService],
        tokenTypes: [TokenType.NATIVE],
      });

      expect(glacierService.getNativeBalance).toHaveBeenCalled();
      expect(glacierService.listErc20Balances).not.toHaveBeenCalled();
      expect(glacierService.listNftBalances).not.toHaveBeenCalled();
    });

    it('does not fetch native balances if not explicitly asked', async () => {
      await getBalances({
        addresses,
        currency,
        network,
        proxyApiUrl,
        customTokens,
        balanceServices: [glacierService, deBankService],
        tokenTypes: [TokenType.ERC20],
      });

      expect(glacierService.getNativeBalance).not.toHaveBeenCalled();
      expect(glacierService.listErc20Balances).toHaveBeenCalled();
      expect(glacierService.listNftBalances).not.toHaveBeenCalled();
    });
  });
});
