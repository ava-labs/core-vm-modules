import type { BigNumberish } from 'ethers';
import { getProvider } from './get-provider';
import type { ProviderParams } from '../types';

export const estimateGasLimit = async ({
  providerParams: { glacierApiKey, chainId, chainName, rpcUrl, multiContractAddress },
  transactionParams: { from, to, data, value },
}: {
  providerParams: ProviderParams;
  transactionParams: {
    from: string;
    to: string;
    data?: string;
    value?: BigNumberish;
  };
}): Promise<number> => {
  const provider = getProvider({ glacierApiKey, chainId, chainName, rpcUrl, multiContractAddress });
  const nonce = await provider.getTransactionCount(from);

  return Number(
    await provider.estimateGas({
      from,
      to,
      nonce,
      data,
      value,
    }),
  );
};
