import { Avalanche } from '@avalabs/core-wallets-sdk';
import { NetworkVMType, type Network } from '@avalabs/vm-module-types';
import { getAddressesByIndices } from './get-addresses-by-indices';
import { getProvider } from '../../../utils/get-provider';

jest.mock('../../../utils/get-provider');
jest.mock('@avalabs/core-wallets-sdk', () => ({
  Avalanche: {
    getAddressFromXpub: jest.fn(),
  },
}));

const mockNetwork: Network = {
  isTestnet: false,
  vmName: NetworkVMType.PVM,
  chainId: 1,
  chainName: 'Avalanche P-Chain',
  rpcUrl: 'https://example.com',
  networkToken: {
    decimals: 9,
    symbol: 'AVAX',
    name: 'Avalanche',
    logoUri: '',
  },
};

describe('getAddressesByIndices', () => {
  const mockProvider = { networkID: 1 };

  beforeEach(() => {
    jest.resetAllMocks();
    (getProvider as jest.Mock).mockResolvedValue(mockProvider);
  });

  describe('with xpubXP', () => {
    const baseParams = {
      indices: [0, 1],
      network: mockNetwork,
      xpubXP: 'xpub-test',
    };

    it('resolves external X-chain addresses', async () => {
      (Avalanche.getAddressFromXpub as jest.Mock).mockImplementation((_xpub, index) => `X-addr-${index}`);

      const result = await getAddressesByIndices({
        ...baseParams,
        chainAlias: 'X',
        isChange: false,
      });

      expect(result).toEqual(['X-addr-0', 'X-addr-1']);
      expect(Avalanche.getAddressFromXpub).toHaveBeenCalledWith('xpub-test', 0, mockProvider, 'X', false);
    });

    it('resolves internal (change) X-chain addresses', async () => {
      (Avalanche.getAddressFromXpub as jest.Mock).mockImplementation((_xpub, index) => `X-change-${index}`);

      const result = await getAddressesByIndices({
        ...baseParams,
        chainAlias: 'X',
        isChange: true,
      });

      expect(result).toEqual(['X-change-0', 'X-change-1']);
    });

    it('resolves external P-chain addresses', async () => {
      (Avalanche.getAddressFromXpub as jest.Mock).mockImplementation((_xpub, index) => `P-addr-${index}`);

      const result = await getAddressesByIndices({
        ...baseParams,
        chainAlias: 'P',
        isChange: false,
      });

      expect(result).toEqual(['P-addr-0', 'P-addr-1']);
    });

    it('resolves internal (change) P-chain addresses', async () => {
      (Avalanche.getAddressFromXpub as jest.Mock).mockImplementation((_xpub, index) => `P-change-${index}`);

      const result = await getAddressesByIndices({
        ...baseParams,
        chainAlias: 'P',
        isChange: true,
      });

      expect(result).toEqual(['P-change-0', 'P-change-1']);
      expect(Avalanche.getAddressFromXpub).toHaveBeenCalledWith('xpub-test', 0, mockProvider, 'P', true);
    });
  });

  describe('with externalXPAddresses', () => {
    const externalXPAddresses = [
      { index: 0, address: 'P-addr-0' },
      { index: 2, address: 'P-addr-2' },
    ];

    it('resolves addresses by matching indices', async () => {
      const result = await getAddressesByIndices({
        indices: [0, 2],
        chainAlias: 'P',
        isChange: false,
        network: mockNetwork,
        externalXPAddresses,
      });

      expect(result).toEqual(['P-addr-0', 'P-addr-2']);
    });

    it('filters out indices that have no matching address', async () => {
      const result = await getAddressesByIndices({
        indices: [0, 99],
        chainAlias: 'P',
        isChange: false,
        network: mockNetwork,
        externalXPAddresses,
      });

      expect(result).toEqual(['P-addr-0']);
    });
  });

  describe('fallback', () => {
    it('returns empty array when no xpubXP or externalXPAddresses provided', async () => {
      const result = await getAddressesByIndices({
        indices: [0],
        chainAlias: 'P',
        isChange: false,
        network: mockNetwork,
      });

      expect(result).toEqual([]);
    });
  });
});
