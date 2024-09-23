import { AppName, Environment, type Network } from '@avalabs/vm-module-types';

import { BitcoinModule } from './module';
import { getNetworkFee } from './handlers/get-network-fee/get-network-fee';
import { getBalances } from './handlers/get-balances/get-balances';
import { devEnv, prodEnv } from './env';

jest.mock('./handlers/get-network-fee/get-network-fee');
jest.mock('./handlers/get-balances/get-balances');

describe('bitcoin-module', () => {
  describe('getNetworkFee()', () => {
    it('uses the get-network-fee handler', async () => {
      const devModule = new BitcoinModule({
        environment: Environment.DEV,
        approvalController: {} as any, // eslint-disable-line
        appName: AppName.OTHER,
        appVersion: '1.0',
      });
      await devModule.getNetworkFee({ isTestnet: true } as Network);

      expect(getNetworkFee).toHaveBeenCalledWith({
        isTestnet: true,
        proxyApiUrl: devEnv.proxyApiUrl,
      });

      const prodModule = new BitcoinModule({
        environment: Environment.PRODUCTION,
        approvalController: {} as any, // eslint-disable-line
        appName: AppName.OTHER,
        appVersion: '1.0',
      });
      await prodModule.getNetworkFee({ isTestnet: false } as Network);

      expect(getNetworkFee).toHaveBeenCalledWith({
        isTestnet: false,
        proxyApiUrl: prodEnv.proxyApiUrl,
      });
    });
  });

  describe('getBalances()', () => {
    it('uses the get-balances handler', async () => {
      const params = {
        network: { isTestnet: true } as Network,
        addresses: ['address-1'],
        currency: 'USD',
      };

      const devModule = new BitcoinModule({
        environment: Environment.DEV,
        approvalController: {} as any, // eslint-disable-line
        appName: AppName.OTHER,
        appVersion: '1.0',
      });
      await devModule.getBalances(params);

      expect(getBalances).toHaveBeenCalledWith({
        ...params,
        proxyApiUrl: devEnv.proxyApiUrl,
      });

      const prodModule = new BitcoinModule({
        environment: Environment.PRODUCTION,
        approvalController: {} as any, // eslint-disable-line
        appName: AppName.OTHER,
        appVersion: '1.0',
      });
      await prodModule.getBalances(params);

      expect(getBalances).toHaveBeenCalledWith({
        ...params,
        proxyApiUrl: prodEnv.proxyApiUrl,
      });
    });
  });
});
