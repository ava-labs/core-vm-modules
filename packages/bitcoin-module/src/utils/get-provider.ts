import { BitcoinProvider } from '@avalabs/core-wallets-sdk';

type ProviderParams = {
  isTestnet: boolean;
  proxyApiUrl: string;
};

export const getProvider = async ({ isTestnet, proxyApiUrl }: ProviderParams): Promise<BitcoinProvider> => {
  return new BitcoinProvider(
    !isTestnet,
    undefined,
    `${proxyApiUrl}/proxy/nownodes/${isTestnet ? 'btcbook-testnet' : 'btcbook'}`,
    `${proxyApiUrl}/proxy/nownodes/${isTestnet ? 'btc-testnet' : 'btc'}`,
  );
};
