import { BitcoinProvider } from '@avalabs/core-wallets-sdk';

type ProviderParams = {
  isTestnet: boolean;
  proxyApiUrl: string;
};

export const getProvider = ({ isTestnet, proxyApiUrl }: ProviderParams): BitcoinProvider =>
  new BitcoinProvider(
    !isTestnet,
    undefined,
    `${proxyApiUrl}/proxy/nownodes/${isTestnet ? 'btcbook-testnet' : 'btcbook'}`,
    `${proxyApiUrl}/proxy/nownodes/${isTestnet ? 'btc-testnet' : 'btc'}`,

    // The Glacier API key is only needed in development to bypass rate limits.
    // It should never be used in production.
    process.env.GLACIER_API_KEY ? { token: process.env.GLACIER_API_KEY } : {},
  );
