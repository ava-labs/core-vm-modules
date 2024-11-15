import { TokenType } from '@avalabs/vm-module-types';
import BaseTx from '../../fixtures/x-chain-base-tx-history-item.json';
import ImportTx from '../../fixtures/x-chain-import-tx-history-item.json';
import ExportTx from '../../fixtures/x-chain-export-tx-history-item.json';
import { convertXChainTransaction } from './convert-x-chain-transaction';

describe('convertXChainTransaction', () => {
  it('converts base tx correctly for sender', () => {
    const result = convertXChainTransaction({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      tx: BaseTx,
      address: 'fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k',
      networkToken: {
        name: 'AVAX',
        symbol: 'AVAX',
        decimals: 9,
      },
      chainId: 1234,
      isTestnet: true,
    });

    expect(result).toStrictEqual({
      hash: BaseTx.txHash,
      isContractCall: false,
      isIncoming: false,
      isOutgoing: true,
      from: 'fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k',
      to: 'fuji1wdel5tqgak75mznvdjftz95xrmgtx4xzz2jv02,fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k',
      isSender: true,
      timestamp: BaseTx.timestamp * 1000,
      tokens: [
        {
          decimal: '9',
          name: 'AVAX',
          symbol: 'AVAX',
          type: TokenType.NATIVE,
          amount: '0.5',
        },
      ],
      gasUsed: '0.001',
      explorerLink: '/tx/L9QFXNbVpPo8Njx7Z8PTAsapG1CyrwejyseDvgoSLYFwZibbS',
      txType: BaseTx.txType,
      chainId: '1234',
    });
  });

  it('converts base tx correctly for receiver', () => {
    const result = convertXChainTransaction({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      tx: BaseTx,
      address: 'fuji1wdel5tqgak75mznvdjftz95xrmgtx4xzz2jv02',
      networkToken: {
        name: 'AVAX',
        symbol: 'AVAX',
        decimals: 9,
      },
      chainId: 1234,
      isTestnet: true,
    });

    expect(result).toStrictEqual({
      hash: BaseTx.txHash,
      isContractCall: false,
      isIncoming: true,
      isOutgoing: false,
      from: 'fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k',
      to: 'fuji1wdel5tqgak75mznvdjftz95xrmgtx4xzz2jv02,fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k',
      isSender: false,
      timestamp: BaseTx.timestamp * 1000,
      tokens: [
        {
          decimal: '9',
          name: 'AVAX',
          symbol: 'AVAX',
          type: TokenType.NATIVE,
          amount: '0.5',
        },
      ],
      gasUsed: '0.001',
      explorerLink: '/tx/L9QFXNbVpPo8Njx7Z8PTAsapG1CyrwejyseDvgoSLYFwZibbS',
      txType: BaseTx.txType,
      chainId: '1234',
    });
  });

  it('converts import tx correctly', () => {
    const result = convertXChainTransaction({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      tx: ImportTx,
      address: 'fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k',
      networkToken: {
        name: 'AVAX',
        symbol: 'AVAX',
        decimals: 9,
      },
      chainId: 1234,
      isTestnet: true,
    });

    expect(result).toStrictEqual({
      hash: ImportTx.txHash,
      isContractCall: false,
      isIncoming: false,
      isOutgoing: true,
      from: 'fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k',
      to: 'fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k',
      isSender: true,
      timestamp: ImportTx.timestamp * 1000,
      tokens: [
        {
          decimal: '9',
          name: 'AVAX',
          symbol: 'AVAX',
          type: TokenType.NATIVE,
          amount: '0.099',
        },
      ],
      gasUsed: '0.001',
      explorerLink: '/tx/2dKjKzeDMjJXNejU3jgYpLpTSRoaFvk4z43SM4tG1LyDT9mFrE',
      txType: ImportTx.txType,
      chainId: '1234',
    });
  });

  it('converts export tx correctly', () => {
    const result = convertXChainTransaction({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      tx: ExportTx,
      address: 'fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k',
      networkToken: {
        name: 'AVAX',
        symbol: 'AVAX',
        decimals: 9,
      },
      chainId: 1234,
      isTestnet: true,
    });

    expect(result).toStrictEqual({
      hash: ExportTx.txHash,
      isContractCall: false,
      isIncoming: false,
      isOutgoing: true,
      from: 'fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k',
      to: 'fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k',
      isSender: true,
      timestamp: ExportTx.timestamp * 1000,
      tokens: [
        {
          decimal: '9',
          name: 'AVAX',
          symbol: 'AVAX',
          type: TokenType.NATIVE,
          amount: '0.1',
        },
      ],
      gasUsed: '0.001',
      explorerLink: '/tx/244d9WvuT1SRZRDG2ytnCgNQQ9joUyBf8W7mDDW9q8uag6ayb9',
      txType: ExportTx.txType,
      chainId: '1234',
    });
  });
});
