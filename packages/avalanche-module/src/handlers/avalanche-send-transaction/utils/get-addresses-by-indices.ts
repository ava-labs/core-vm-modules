import { Avalanche } from '@avalabs/core-wallets-sdk';
import { getProvider } from '../../../utils/get-provider';

export const getAddressesByIndices = async ({
  indices,
  chainAlias,
  isChange,
  isTestnet,
  xpubXP,
  externalXPAddresses,
}: {
  indices: number[];
  chainAlias: 'X' | 'P';
  isChange: boolean;
  isTestnet: boolean;
  xpubXP?: string;
  externalXPAddresses?: { index: number; address: string }[];
}): Promise<string[]> => {
  if (isChange && chainAlias !== 'X') {
    return [];
  }

  if (xpubXP) {
    const provider = await getProvider({ isTestnet });

    return indices.map((index) => Avalanche.getAddressFromXpub(xpubXP, index, provider, chainAlias, isChange));
  }

  if (externalXPAddresses && Array.isArray(externalXPAddresses)) {
    const accounts = indices
      .map((index) => externalXPAddresses.find((address) => address.index === index))
      .filter((acc) => acc !== undefined);

    return accounts.map((account) => account.address);
  }

  return [];
};
