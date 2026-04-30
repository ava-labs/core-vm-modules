import { Avalanche } from '@avalabs/core-wallets-sdk';
import type { Network } from '@avalabs/vm-module-types';
import { getProvider } from '../../../utils/get-provider';

export const getAddressesByIndices = async ({
  indices,
  chainAlias,
  isChange,
  network,
  xpubXP,
  externalXPAddresses,
}: {
  indices: number[];
  chainAlias: 'X' | 'P';
  isChange: boolean;
  network: Network;
  xpubXP?: string;
  externalXPAddresses?: { index: number; address: string }[];
}): Promise<string[]> => {
  if (xpubXP) {
    const provider = await getProvider(network);

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
