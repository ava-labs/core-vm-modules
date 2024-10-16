import { Avalanche } from '@avalabs/core-wallets-sdk';
import { getProvider } from '../../../utils/get-provider';

export const getAddressesByIndices = async ({
  indices,
  chainAlias,
  isChange,
  isTestnet,
  xpubXP,
}: {
  indices: number[];
  chainAlias: 'X' | 'P';
  isChange: boolean;
  isTestnet: boolean;
  xpubXP?: string;
}): Promise<string[]> => {
  if (!xpubXP || (isChange && chainAlias !== 'X')) {
    return [];
  }

  const provider = await getProvider({ isTestnet });

  return indices.map((index) => Avalanche.getAddressFromXpub(xpubXP, index, provider, chainAlias, isChange));
};
