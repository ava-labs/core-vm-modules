import { Avalanche } from '@avalabs/core-wallets-sdk';
import { getProvider } from '../../../utils/get-provider';

export const getAddressesByIndices = async ({
  indices,
  chainAlias,
  isChange,
  isTestnet,
  xpubXP,
  isDevnet,
}: {
  indices: number[];
  chainAlias: 'X' | 'P';
  isChange: boolean;
  isTestnet: boolean;
  xpubXP?: string;
  isDevnet?: boolean;
}): Promise<string[]> => {
  if (!xpubXP || (isChange && chainAlias !== 'X')) {
    return [];
  }

  const provider = await getProvider({ isTestnet, isDevnet });

  return indices.map((index) => Avalanche.getAddressFromXpub(xpubXP, index, provider, chainAlias, isChange));
};
