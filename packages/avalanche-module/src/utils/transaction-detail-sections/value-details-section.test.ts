import { DetailItemType, type TxOutput, type TxValueDetails } from '@avalabs/vm-module-types';

import { valueDetailsSection } from './value-details-section';

const createOutput = (overrides: Partial<TxOutput> = {}): TxOutput => ({
  assetId: 'avaxAssetId',
  amount: 100n,
  owners: ['X-fuji1recipient'],
  locktime: 0n,
  stakeableLocktime: 0n,
  threshold: 1n,
  isAvax: true,
  ...overrides,
});

const valueDetails = (overrides: Partial<TxValueDetails> = {}): TxValueDetails => ({
  outputs: [],
  inputAmounts: {},
  outputAmounts: {},
  totalAvaxInput: 0n,
  totalAvaxOutput: 0n,
  totalAvaxBurned: 0n,
  ...overrides,
});

const getTransfer = (tx: TxValueDetails) => {
  const [item] = valueDetailsSection(tx, 'AVAX')?.items ?? [];

  return typeof item === 'string' || item?.type !== DetailItemType.TRANSFER_LIST ? undefined : item.value;
};

describe('valueDetailsSection', () => {
  it('returns the outputs as a list', () => {
    const section = valueDetailsSection(
      valueDetails({ outputs: [createOutput(), createOutput({ owners: ['X-fuji1other'], amount: 7n })] }),
      'AVAX',
    );

    expect(section).toEqual({
      title: 'Transaction Outputs',
      items: [expect.objectContaining({ type: DetailItemType.TRANSFER_LIST })],
    });
    expect(
      getTransfer(valueDetails({ outputs: [createOutput(), createOutput({ owners: ['X-fuji1other'], amount: 7n })] })),
    ).toEqual([
      expect.objectContaining({ addresses: ['X-fuji1recipient'], amount: 100n }),
      expect.objectContaining({ addresses: ['X-fuji1other'], amount: 7n }),
    ]);
  });

  it('returns undefined when there are no outputs', () => {
    expect(valueDetailsSection(valueDetails(), 'AVAX')).toBeUndefined();
  });

  it('returns the proper AVAX details', () => {
    expect(getTransfer(valueDetails({ outputs: [createOutput()] }))?.[0]).toMatchObject({
      symbol: 'AVAX',
      decimals: 9,
    });
  });

  it('returns the proper non-AVAX asset details', () => {
    const transfers = getTransfer(
      valueDetails({
        outputs: [
          createOutput({
            isAvax: false,
            assetId: 'tokenId',
            assetDescription: { assetID: 'tokenId', name: 'Some Token', symbol: 'TKN', denomination: 2 },
          }),
        ],
      }),
    );

    expect(transfers?.[0]).toMatchObject({ symbol: 'TKN', decimals: 2, assetName: 'Some Token' });
  });

  it('returns assetId even when the currency details are unknown', () => {
    const transfers = getTransfer(valueDetails({ outputs: [createOutput({ isAvax: false, assetId: 'tokenId' })] }));

    expect(transfers?.[0]?.symbol).toBeUndefined();
    expect(transfers?.[0]?.assetId).toEqual('tokenId');
  });

  it('returns the proper lock details', () => {
    const transfers = getTransfer(
      valueDetails({ outputs: [createOutput({ locktime: 1700n, stakeableLocktime: 9900n })] }),
    );

    expect(transfers?.[0]).toMatchObject({ lockedUntil: 1700, stakeableLockedUntil: 9900 });
  });

  it('returns the proper threshold details', () => {
    const shared = getTransfer(
      valueDetails({ outputs: [createOutput({ owners: ['X-fuji1a', 'X-fuji1b'], threshold: 2n })] }),
    );
    const sole = getTransfer(valueDetails({ outputs: [createOutput()] }));

    expect(shared?.[0]?.threshold).toEqual(2);
    expect(sole?.[0]?.threshold).toEqual(1);
  });

  it('returns outputs with no owners', () => {
    const transfers = getTransfer(valueDetails({ outputs: [createOutput({ owners: [] })] }));

    expect(transfers?.[0]).toMatchObject({ addresses: [], amount: 100n });
  });
});
