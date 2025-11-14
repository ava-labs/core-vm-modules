import { Avalanche } from '@avalabs/core-wallets-sdk';
import { getProvider } from '../../../utils/get-provider';

export const getAddressesByIndices = async ({
  indices,
  chainAlias,
  isChange,
  isTestnet,
  xpubXP,
  xpAddresses,
}: {
  indices: number[];
  chainAlias: 'X' | 'P';
  isChange: boolean;
  isTestnet: boolean;
  xpubXP?: string;
  xpAddresses?: { index: number; address: string }[];
}): Promise<string[]> => {
  if (isChange && chainAlias !== 'X') {
    return [];
  }

  if (xpubXP) {
    const provider = await getProvider({ isTestnet });

    return indices.map((index) => Avalanche.getAddressFromXpub(xpubXP, index, provider, chainAlias, isChange));
  }

  if (xpAddresses && Array.isArray(xpAddresses)) {
    const accounts = indices
      .map((index) => xpAddresses.find((address) => address.index === index))
      .filter((acc) => acc !== undefined);

    return accounts.map((account) => account.address);
  }

  return [];
};
