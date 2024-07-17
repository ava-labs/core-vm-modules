import { Environment, type Network } from '@avalabs/vm-module-types';
import { devEnv, prodEnv } from '@internal/utils/src/utils/env';

import { BitcoinModule } from './module';
import { getNetworkFee } from './handlers/get-network-fee';

jest.mock('./handlers/get-network-fee');

describe('bitcoin-module', () => {
  describe('getNetworkFee()', () => {
    it('uses the get-network-fee handler', async () => {
      const devModule = new BitcoinModule({ environment: Environment.DEV });
      await devModule.getNetworkFee({ isTestnet: true } as Network);

      expect(getNetworkFee).toHaveBeenCalledWith({
        isTestnet: true,
        proxyApiUrl: devEnv.proxyApiUrl,
      });

      const prodModule = new BitcoinModule({ environment: Environment.PRODUCTION });
      await prodModule.getNetworkFee({ isTestnet: false } as Network);

      expect(getNetworkFee).toHaveBeenCalledWith({
        isTestnet: false,
        proxyApiUrl: prodEnv.proxyApiUrl,
      });
    });
  });
});
