import { NetworkVMType } from '@avalabs/vm-module-types';
import { getNetworkFee } from './get-network-fee';
import { info, pvm } from '@avalabs/avalanchejs';

jest.spyOn(info.InfoApi.prototype, 'getUpgradesInfo').mockResolvedValue(
  Promise.resolve({
    apricotPhaselTime: '2021-02-19T00:00:00Z',
    apricotPhase2Time: '2021-02-19T00:00:00Z',
    apricotPhase3Time: '2021-02-19T00:00:00Z',
    apricotPhase4Time: '2021-02-19T00:00:00Z',
    apricotPhase4MinPChainHeight: 1,
    apricotPhase5Time: '2021-02-19T00:00:00Z',
    apricotPhasePre6Time: '2021-02-19T00:00:00Z',
    apricotPhase6Time: '2021-02-19T00:00:00Z',
    apricotPhasePost6Time: '2021-02-19T00:00:00Z',
    banffTime: '2021-02-19T00:00:00Z',
    cortinaTime: '2021-02-19T00:00:00Z',
    cortinaXChainStopVertexID: '2021-02-19T00:00:00Z',
    durangoTime: '2021-02-19T00:00:00Z',
    etnaTime: '0001-02-19T00:00:00Z',
  }),
);

jest
  .spyOn(pvm.PVMApi.prototype, 'getFeeState')
  .mockResolvedValue(Promise.resolve({ capacity: 1n, excess: 1n, price: 1n, timestamp: '2021-02-19T00:00:00Z' }));

describe('get-network-fee', () => {
  it('should return fixed network fees', async () => {
    await expect(getNetworkFee({ isTestnet: false, vmName: NetworkVMType.AVM })).resolves.toEqual({
      baseFee: 1000000n,
      low: {
        maxFeePerGas: 1000000n,
      },
      medium: {
        maxFeePerGas: 1000000n,
      },
      high: {
        maxFeePerGas: 1000000n,
      },
      isFixedFee: true,
    });
  });

  it('should return dynamic network fees', async () => {
    await expect(getNetworkFee({ isTestnet: true, vmName: NetworkVMType.PVM })).resolves.toEqual({
      baseFee: 1n,
      low: {
        maxFeePerGas: 1n,
      },
      medium: {
        maxFeePerGas: 2n,
      },
      high: {
        maxFeePerGas: 2n,
      },
      isFixedFee: false,
    });
  });
});
