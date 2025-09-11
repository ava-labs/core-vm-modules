import {
  avaxSerial,
  evmSerial,
  utils,
  type EVMUnsignedTx,
  type UnsignedTx,
  type Utxo,
  type VM,
} from '@avalabs/avalanchejs';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { rpcErrors } from '@metamask/rpc-errors';
import { getUnsignedOrPartiallySignedTx } from './get-unsigned-or-partially-signed-tx';

jest.mock('@avalabs/avalanchejs');
jest.mock('@avalabs/core-wallets-sdk');

describe('getUnsignedOrPartiallySignedTx', () => {
  const mockTxBytes = new Uint8Array([0, 1, 2, 3, 4]);
  const mockVM = 'AVM' as VM;
  const mockUtxos = [{ utxoId: '1' }, { utxoId: '2' }] as unknown as Utxo[];
  const currentAddress = 'X-avax1234567890';
  const currentEvmAddress = '0x1234567890abcdef';
  const mockProvider = { provider: 'mock' } as unknown as Avalanche.JsonRpcProvider;

  const mockTx = {
    getSigIndices: jest.fn(),
    ins: [],
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const mockEvmUnsignedTx = { type: 'EVMUnsignedTx' } as unknown as EVMUnsignedTx;
  const mockUnsignedTx = { type: 'UnsignedTx' } as unknown as UnsignedTx;
  const mockSignedTx = {
    getCredentials: jest.fn(),
  };
  const mockCodecManager = {
    unpack: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // Mock utils
    jest.mocked(utils.unpackWithManager).mockReturnValue(mockTx as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    jest.mocked(utils.getManagerForVM).mockReturnValue(mockCodecManager as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    // Mock evmSerial
    jest.mocked(evmSerial.isExportTx).mockReturnValue(false);
    jest.mocked(evmSerial.isImportTx).mockReturnValue(false);

    // Mock Avalanche SDK methods
    (Avalanche.createAvalancheEvmUnsignedTx as jest.Mock).mockResolvedValue(mockEvmUnsignedTx);
    (Avalanche.createAvalancheUnsignedTx as jest.Mock).mockResolvedValue(mockUnsignedTx);
    (Avalanche.populateCredential as jest.Mock).mockReturnValue([]);

    // Mock tx methods
    mockTx.getSigIndices.mockReturnValue([
      [0, 1],
      [2, 3],
    ]);
    mockSignedTx.getCredentials.mockReturnValue([]);
  });

  describe('EVM Export Transaction', () => {
    const evmExportTx = {
      ...mockTx,
      ins: [
        {
          address: {
            toHex: () => currentEvmAddress.toLowerCase(),
          },
        },
      ],
    };
    beforeEach(() => {
      jest.mocked(evmSerial.isExportTx).mockReturnValue(true);
      jest.mocked(utils.unpackWithManager).mockReturnValue(evmExportTx);
    });

    it('handles EVM export transaction with valid addresses', async () => {
      const result = await getUnsignedOrPartiallySignedTx({
        vm: mockVM,
        txBytes: mockTxBytes,
        utxos: mockUtxos,
        currentAddress,
        currentEvmAddress,
        provider: mockProvider,
      });

      expect(evmSerial.isExportTx).toHaveBeenCalledWith(evmExportTx);
      expect(Avalanche.createAvalancheEvmUnsignedTx).toHaveBeenCalledWith({
        txBytes: mockTxBytes,
        vm: mockVM,
        utxos: mockUtxos,
        fromAddress: currentAddress,
      });
      expect(result).toBe(mockEvmUnsignedTx);
    });

    it('throws an error when EVM address is missing for export transaction', async () => {
      await expect(
        getUnsignedOrPartiallySignedTx({
          vm: 'EVM',
          txBytes: mockTxBytes,
          utxos: mockUtxos,
          currentAddress,
          currentEvmAddress: undefined,
          provider: mockProvider,
        }),
      ).rejects.toEqual(rpcErrors.invalidRequest('Missing EVM address'));
    });

    it('throws an error when spender address does not match current EVM address', async () => {
      const differentAddress = '0xdifferent';
      jest.mocked(utils.unpackWithManager).mockReturnValue({
        ...mockTx,
        ins: [
          {
            address: {
              toHex: () => differentAddress,
            },
          },
        ],
      });

      await expect(
        getUnsignedOrPartiallySignedTx({
          vm: 'EVM',
          txBytes: mockTxBytes,
          utxos: mockUtxos,
          currentAddress,
          currentEvmAddress,
          provider: mockProvider,
        }),
      ).rejects.toThrow('This account has nothing to sign');
    });

    it('handles case-insensitive address comparison', async () => {
      jest.mocked(utils.unpackWithManager).mockReturnValue({
        ...mockTx,
        ins: [
          {
            address: {
              toHex: () => currentEvmAddress.toUpperCase(),
            },
          },
        ],
      });

      const result = await getUnsignedOrPartiallySignedTx({
        vm: mockVM,
        txBytes: mockTxBytes,
        utxos: mockUtxos,
        currentAddress,
        currentEvmAddress: currentEvmAddress.toLowerCase(),
        provider: mockProvider,
      });

      expect(result).toBe(mockEvmUnsignedTx);
    });
  });

  describe('EVM Import Transaction', () => {
    beforeEach(() => {
      jest.mocked(evmSerial.isExportTx).mockReturnValue(false);
      jest.mocked(evmSerial.isImportTx).mockReturnValue(true);
      mockCodecManager.unpack.mockReturnValue(mockSignedTx);
    });

    it('handles EVM import transaction with signed transaction', async () => {
      const result = await getUnsignedOrPartiallySignedTx({
        vm: 'PVM',
        txBytes: mockTxBytes,
        utxos: mockUtxos,
        currentAddress,
        currentEvmAddress,
        provider: mockProvider,
      });

      expect(evmSerial.isImportTx).toHaveBeenCalledWith(mockTx);
      expect(mockCodecManager.unpack).toHaveBeenCalledWith(mockTxBytes, avaxSerial.SignedTx);
      expect(Avalanche.createAvalancheEvmUnsignedTx).toHaveBeenCalledWith({
        txBytes: mockTxBytes,
        vm: 'PVM',
        utxos: mockUtxos,
        fromAddress: currentAddress,
      });
      expect(result).toBe(mockUnsignedTx);
    });
  });

  describe('PVM/AVM Transaction', () => {
    beforeEach(() => {
      jest.mocked(evmSerial.isExportTx).mockReturnValue(false);
      jest.mocked(evmSerial.isImportTx).mockReturnValue(false);
    });

    it('should handle PVM/AVM transaction with signed credentials', async () => {
      const mockCredentials = [{ cred: 'mock' }];
      mockCodecManager.unpack.mockReturnValue(mockSignedTx);
      mockSignedTx.getCredentials.mockReturnValue(mockCredentials);
      (Avalanche.populateCredential as jest.Mock).mockReturnValue(['signature1', 'signature2']);

      const result = await getUnsignedOrPartiallySignedTx({
        vm: 'PVM',
        txBytes: mockTxBytes,
        utxos: mockUtxos,
        currentAddress,
        currentEvmAddress,
        provider: mockProvider,
      });

      expect(mockCodecManager.unpack).toHaveBeenCalledWith(mockTxBytes, avaxSerial.SignedTx);
      expect(Avalanche.createAvalancheUnsignedTx).toHaveBeenCalledWith({
        tx: mockTx,
        provider: mockProvider,
        credentials: mockCredentials,
        utxos: mockUtxos,
      });
      expect(mockTx.getSigIndices).toHaveBeenCalled();
      expect(Avalanche.populateCredential).toHaveBeenCalledWith([0, 1], {
        unsignedTx: mockUnsignedTx,
        credentialIndex: 0,
      });
      expect(Avalanche.populateCredential).toHaveBeenCalledWith([2, 3], {
        unsignedTx: mockUnsignedTx,
        credentialIndex: 1,
      });
      expect(result).toBe(mockUnsignedTx);
    });

    it('handles transaction without signed credentials (unsigned)', async () => {
      mockCodecManager.unpack.mockImplementation(() => {
        throw new Error('Transaction not signed');
      });
      (Avalanche.populateCredential as jest.Mock).mockReturnValue(['empty']);

      const result = await getUnsignedOrPartiallySignedTx({
        vm: mockVM,
        txBytes: mockTxBytes,
        utxos: mockUtxos,
        currentAddress,
        currentEvmAddress,
        provider: mockProvider,
      });

      expect(mockTx.getSigIndices).toHaveBeenCalled();
      expect(Avalanche.populateCredential).toHaveBeenCalledWith([0, 1]);
      expect(Avalanche.populateCredential).toHaveBeenCalledWith([2, 3]);
      expect(Avalanche.createAvalancheUnsignedTx).toHaveBeenCalledWith({
        tx: mockTx,
        provider: mockProvider,
        credentials: expect.any(Array),
        utxos: mockUtxos,
      });
      expect(result).toBe(mockUnsignedTx);
    });
  });

  it('handles transaction with empty credentials', async () => {
    jest.mocked(evmSerial.isExportTx).mockReturnValue(false);
    jest.mocked(evmSerial.isImportTx).mockReturnValue(false);
    mockTx.getSigIndices.mockReturnValue([]);
    mockCodecManager.unpack.mockImplementation(() => {
      throw new Error('Not signed');
    });

    const result = await getUnsignedOrPartiallySignedTx({
      vm: mockVM,
      txBytes: mockTxBytes,
      utxos: mockUtxos,
      currentAddress,
      currentEvmAddress,
      provider: mockProvider,
    });

    expect(Avalanche.createAvalancheUnsignedTx).toHaveBeenCalledWith({
      tx: mockTx,
      provider: mockProvider,
      credentials: [],
      utxos: mockUtxos,
    });
    expect(result).toBe(mockUnsignedTx);
  });

  it('passes correct parameters to utils.unpackWithManager', async () => {
    jest.mocked(evmSerial.isExportTx).mockReturnValue(false);
    jest.mocked(evmSerial.isImportTx).mockReturnValue(false);
    mockCodecManager.unpack.mockImplementation(() => {
      throw new Error('Not signed');
    });

    await getUnsignedOrPartiallySignedTx({
      vm: mockVM,
      txBytes: mockTxBytes,
      utxos: mockUtxos,
      currentAddress,
      currentEvmAddress,
      provider: mockProvider,
    });

    expect(utils.unpackWithManager).toHaveBeenCalledWith(mockVM, mockTxBytes);
  });

  it('passes correct parameters to utils.getManagerForVM', async () => {
    jest.mocked(evmSerial.isExportTx).mockReturnValue(false);
    jest.mocked(evmSerial.isImportTx).mockReturnValue(false);
    mockCodecManager.unpack.mockReturnValue(mockSignedTx);

    await getUnsignedOrPartiallySignedTx({
      vm: mockVM,
      txBytes: mockTxBytes,
      utxos: mockUtxos,
      currentAddress,
      currentEvmAddress,
      provider: mockProvider,
    });

    expect(utils.getManagerForVM).toHaveBeenCalledWith(mockVM);
  });
});
