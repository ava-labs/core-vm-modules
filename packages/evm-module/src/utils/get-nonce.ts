import type { ProviderParams } from '../types';
import { getProvider } from './get-provider';

export const getNonce = async ({
  from,
  providerParams: { glacierApiKey, chainId, chainName, rpcUrl, multiContractAddress },
}: {
  from: string;
  providerParams: ProviderParams;
}): Promise<number> => {
  const provider = getProvider({ glacierApiKey, chainId, chainName, rpcUrl, multiContractAddress });
  return provider.getTransactionCount(from);
};
