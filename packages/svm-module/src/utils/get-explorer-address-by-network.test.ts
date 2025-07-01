import { NetworkVMType, type Network } from '@avalabs/vm-module-types';

import { getExplorerAddressByNetwork } from './get-explorer-address-by-network';

describe('getExplorerAddressByNetwork', () => {
  const mockHash = '0xd0f608d667c54f5dae47e002c8255e777a078f333d9363';

  const mockNetwork: Network = {
    chainId: 245022934,
    chainName: 'Solana',
    logoUri: 'test-logo-uri',
    explorerUrl: 'https://explorer.solana.com',
    networkToken: {
      symbol: 'SOL',
      decimals: 9,
      name: 'SOL',
    },
    vmName: NetworkVMType.SVM,
    isTestnet: false,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  };

  it('should construct explorer URL for transaction hash', () => {
    const result = getExplorerAddressByNetwork(mockNetwork, mockHash);
    expect(result).toBe('https://explorer.solana.com/tx/0xd0f608d667c54f5dae47e002c8255e777a078f333d9363');
  });

  it('should construct explorer URL for address', () => {
    const result = getExplorerAddressByNetwork(mockNetwork, mockHash, 'address');
    expect(result).toBe('https://explorer.solana.com/address/0xd0f608d667c54f5dae47e002c8255e777a078f333d9363');
  });

  it('should preserve query parameters in explorer URL', () => {
    const networkWithParams: Network = {
      ...mockNetwork,
      explorerUrl: 'https://explorer.solana.com?cluster=devnet',
    };
    const result = getExplorerAddressByNetwork(networkWithParams, mockHash);
    expect(result).toBe(
      'https://explorer.solana.com/tx/0xd0f608d667c54f5dae47e002c8255e777a078f333d9363?cluster=devnet',
    );
  });

  it('should handle missing explorerUrl', () => {
    const networkWithoutExplorer: Network = {
      ...mockNetwork,
      explorerUrl: undefined,
    };
    const result = getExplorerAddressByNetwork(networkWithoutExplorer, mockHash);
    expect(result).toBe('https://explorer.solana.com/tx/0xd0f608d667c54f5dae47e002c8255e777a078f333d9363');
  });

  it('should handle invalid explorerUrl', () => {
    const networkWithInvalidUrl: Network = {
      ...mockNetwork,
      explorerUrl: 'not-a-valid-url',
    };
    const result = getExplorerAddressByNetwork(networkWithInvalidUrl, mockHash);
    expect(result).toBe('not-a-valid-url/tx/0xd0f608d667c54f5dae47e002c8255e777a078f333d9363');
  });
});
