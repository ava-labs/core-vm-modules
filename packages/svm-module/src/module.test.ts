import {
  AppName,
  Environment,
  parseManifest,
  RpcMethod,
  type ApprovalController,
  type Network,
  type RpcRequest,
  type Storage,
} from '@avalabs/vm-module-types';

import ManifestJson from '../manifest.json';
import { SvmModule } from './module';
import { SOLANA_MAINNET_CAIP2_ID } from './constants';
import { getBalances } from './handlers/get-balances';
import { getNetworkFee } from './handlers/get-network-fee';
import { getTokens } from './handlers/get-tokens';
import { getTransactionHistory } from './handlers/get-transaction-history';
import { signAndSendTransaction } from './handlers/sign-and-send-transaction';

jest.mock('./handlers/get-balances');
jest.mock('./handlers/get-network-fee');
jest.mock('./handlers/get-tokens');
jest.mock('./handlers/get-transaction-history');
jest.mock('./handlers/sign-and-send-transaction');

describe('SVM Module', () => {
  const svm = new SvmModule({
    approvalController: {} as ApprovalController,
    environment: Environment.DEV,
    appInfo: {
      name: 'tests' as AppName,
      version: '0.0.0',
    },
  });

  describe('getProvider()', () => {
    it('works with async code', async () => {
      const provider = await svm.getProvider({ caipId: SOLANA_MAINNET_CAIP2_ID } as Network);
      expect(provider).toBeDefined();
    });
  });

  describe('getAddress()', () => {
    it('returns an empty object', async () => {
      expect(await svm.getAddress()).toEqual({});
    });
  });

  describe('getBalances()', () => {
    it('uses get-balances handler', async () => {
      const params = {
        addresses: ['address-1'],
        currency: 'usd',
        network: { caipId: 'solana:xyz' } as Network,
        storage: {} as Storage,
      };
      const mockedResult = {};

      jest.mocked(getBalances).mockResolvedValueOnce(mockedResult);

      expect(await svm.getBalances(params)).toEqual(mockedResult);
      expect(getBalances).toHaveBeenCalledWith({
        ...params,
        tokenService: expect.any(Object),
        proxyApiUrl: expect.any(String),
      });
    });
  });

  describe('getManifest()', () => {
    it('returns an empty object', async () => {
      expect(await svm.getManifest()).toEqual(parseManifest(ManifestJson).data);
    });
  });

  describe('getNetworkFee()', () => {
    it('uses get-network-fee handler', async () => {
      const network = { caipId: 'solana:xyz' } as Network;
      const mockedResult = {};

      jest.mocked(getNetworkFee).mockResolvedValueOnce(mockedResult as any); // eslint-disable-line

      expect(await svm.getNetworkFee(network)).toEqual(mockedResult);
      expect(getNetworkFee).toHaveBeenCalledWith(network, expect.any(String));
    });
  });

  describe('getTransactionHistory()', () => {
    it('uses get-transaction-history handler', async () => {
      const network = { caipId: 'solana:xyz' } as Network;
      const mockedResult = [{}];

      jest.mocked(getTransactionHistory).mockResolvedValueOnce(mockedResult as any); // eslint-disable-line

      expect(
        await svm.getTransactionHistory({
          address: 'test-address',
          network,
        }),
      ).toEqual(mockedResult);
      expect(getTransactionHistory).toHaveBeenCalledWith({
        network,
        address: 'test-address',
        proxyApiUrl: expect.any(String),
      });
    });
  });

  describe('getTokens()', () => {
    it('uses get-tokens handler', async () => {
      const network = { caipId: 'solana:xyz' } as Network;
      const mockedResult = [{}];

      jest.mocked(getTokens).mockResolvedValueOnce(mockedResult as any); // eslint-disable-line

      expect(await svm.getTokens(network)).toEqual(mockedResult);
      expect(getTokens).toHaveBeenCalledWith({
        caip2Id: network.caipId,
        proxyApiUrl: expect.any(String),
      });
    });
  });

  describe('onRpcRequest()', () => {
    it('passes the request to the correct handler', async () => {
      jest.mocked(signAndSendTransaction).mockResolvedValueOnce({
        result: '0xd0f608d667c54f5dae47e002c8255e777a078f333d9363' as `0x${string}`,
      });
      const req = {
        method: RpcMethod.SOLANA_SIGN_AND_SEND_TRANSACTION,
        params: {},
      } as RpcRequest;
      const network = { caipId: 'solana:xyz' } as Network;
      expect(await svm.onRpcRequest(req, network)).toEqual({
        result: '0xd0f608d667c54f5dae47e002c8255e777a078f333d9363' as `0x${string}`,
      });
      expect(signAndSendTransaction).toHaveBeenCalledWith({
        approvalController: expect.any(Object),
        proxyApiUrl: expect.any(String),
        network,
        request: req,
        blockaid: expect.any(Object),
      });
    });
  });
});
