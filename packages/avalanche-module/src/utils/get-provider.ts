import { Avalanche } from '@avalabs/core-wallets-sdk';

type ProviderParams = {
  isTestnet: boolean;
  isDevnet?: boolean;
};

export const getProvider = ({ isDevnet, isTestnet }: ProviderParams): Avalanche.JsonRpcProvider => {
  return isDevnet
    ? new Avalanche.JsonRpcProvider('https://etna.avax-dev.network', {
        addPrimaryNetworkDelegatorFee: 0n,
        addPrimaryNetworkValidatorFee: 0n,
        addSubnetDelegatorFee: 1000000n,
        addSubnetValidatorFee: 1000000n,
        avaxAssetID: '22jjRVdyTJiAEtcZciAVR8bTFyVDUVoo1T3o5PiDspQSZ2maXR',
        baseTxFee: 1000000n,
        cBlockchainID: 'vV3cui1DsEPC3nLCGH9rorwo8s6BYxM2Hz4QFE5gEYjwTqAu',
        createAssetTxFee: 1000000n,
        createBlockchainTxFee: 100000000n,
        createSubnetTxFee: 100000000n,
        hrp: 'custom',
        networkID: 76,
        pBlockchainID: '11111111111111111111111111111111LpoYY',
        transformSubnetTxFee: 100000000n,
        xBlockchainID: '2piQ2AVHCjnduiWXsSY15DtbVuwHE2cwMHYnEXHsLL73BBkdbV',
      })
    : isTestnet
    ? Avalanche.JsonRpcProvider.getDefaultFujiProvider()
    : Avalanche.JsonRpcProvider.getDefaultMainnetProvider();
};
