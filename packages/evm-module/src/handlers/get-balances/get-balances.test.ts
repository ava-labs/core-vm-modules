import { EvmGlacierService } from '../../services/glacier-service/glacier-service';
import { findAsync } from '../../utils/find-async';
import { getBalances } from './get-balances';
import {
  Environment,
  type Network,
  type NetworkContractToken,
  type NetworkTokenWithBalance,
  NetworkVMType,
  type TokenWithBalanceEVM,
} from '@avalabs/vm-module-types';
import { getTokens } from '../get-tokens/get-tokens';
import { getNativeTokenBalances } from './evm-balance-service/get-native-token-balances';
import { getErc20Balances } from './evm-balance-service/get-erc20-balances';
import { TokenService } from '@internal/utils';
import { getEnv } from '../../env';
import { getProvider } from '../../utils/get-provider';
import { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

jest.mock('../../utils/find-async');
jest.mock('../../utils/get-provider');
jest.mock('../../services/debank-service/debank-service');
jest.mock('../../services/glacier-service/glacier-service');
jest.mock('../get-tokens/get-tokens');
jest.mock('./evm-balance-service/get-native-token-balances');
jest.mock('./evm-balance-service/get-erc20-balances');
jest.mock('@internal/utils');

describe('getBalances', () => {
  const { proxyApiUrl } = getEnv(Environment.DEV);
  const glacierService = new EvmGlacierService({ glacierApiUrl: proxyApiUrl }) as jest.Mocked<EvmGlacierService>;
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
    glacierService.getNativeBalance.mockResolvedValue({ symbol: 'ETH', balance: 10000n } as NetworkTokenWithBalance);
    glacierService.listErc20Balances.mockResolvedValue({
      '0xTokenId1': { symbol: 'TOKEN1', balance: 100000n } as TokenWithBalanceEVM,
    });

    const result = await getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl,
      customTokens,
      glacierService,
    });

    expect(result).toEqual({
      '0xAddress1': { ETH: { symbol: 'ETH', balance: 10000n }, '0xTokenId1': { symbol: 'TOKEN1', balance: 100000n } },
      '0xAddress2': { ETH: { symbol: 'ETH', balance: 10000n }, '0xTokenId1': { symbol: 'TOKEN1', balance: 100000n } },
    });
  });

  it('should retrieve balances successfully when no supporting service is found', async () => {
    const mockFindAsync = findAsync as jest.MockedFunction<typeof findAsync>;
    mockFindAsync.mockResolvedValue(undefined);
    const mockGetProvider = getProvider as jest.MockedFunction<typeof getProvider>;
    mockGetProvider.mockReturnValue({} as JsonRpcBatchInternal);
    (getTokens as jest.MockedFunction<typeof getTokens>).mockResolvedValue([]);
    (getNativeTokenBalances as jest.MockedFunction<typeof getNativeTokenBalances>).mockResolvedValue({
      symbol: 'ETH',
      balance: 10000n,
    } as NetworkTokenWithBalance);
    (getErc20Balances as jest.MockedFunction<typeof getErc20Balances>).mockResolvedValue({
      '0xTokenId1': { symbol: 'TOKEN1', balance: 100000n } as TokenWithBalanceEVM,
    });
    const tokenService = new TokenService({ proxyApiUrl }) as jest.Mocked<TokenService>;
    tokenService.getPricesByAddresses.mockResolvedValue(undefined);

    const result = await getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl,
      customTokens,
      glacierService,
    });

    expect(result).toEqual({
      '0xAddress1': { ETH: { symbol: 'ETH', balance: 10000n }, '0xTokenId1': { symbol: 'TOKEN1', balance: 100000n } },
      '0xAddress2': { ETH: { symbol: 'ETH', balance: 10000n }, '0xTokenId1': { symbol: 'TOKEN1', balance: 100000n } },
    });
  });

  it('should handle errors during balance retrieval', async () => {
    const mockFindAsync = findAsync as jest.MockedFunction<typeof findAsync>;
    mockFindAsync.mockResolvedValue(glacierService);
    glacierService.isNetworkSupported.mockResolvedValue(true);
    glacierService.getNativeBalance.mockRejectedValue(new Error('Failed to get native balance'));
    glacierService.listErc20Balances.mockRejectedValue(new Error('Failed to list ERC20 balances'));

    const result = await getBalances({
      addresses,
      currency,
      network,
      proxyApiUrl,
      customTokens,
      glacierService,
    });

    expect(result).toEqual({});
  });
});
