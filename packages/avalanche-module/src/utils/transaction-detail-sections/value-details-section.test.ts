import {
  DetailItemType,
  NetworkVMType,
  type Transfer,
  type TxDetails,
  type TxOutput,
  type TxValueDetails,
  TxType,
} from '@avalabs/vm-module-types';

import { valueDetailsSection } from './value-details-section';

const createOutput = (overrides: Partial<TxOutput> = {}): TxOutput => ({
  assetId: 'avaxAssetId',
  amount: 100n,
  owners: ['X-fuji1recipient'],
  locktime: 0n,
  stakeableLocktime: 0n,
  threshold: 1n,
  isAvax: true,
  isStake: false,
  ...overrides,
});

const valueDetails = (overrides: Partial<TxValueDetails> = {}): TxDetails => ({
  type: TxType.Base,
  chain: NetworkVMType.AVM,
  txFee: 0n,
  outputs: [],
  inputAmounts: {},
  outputAmounts: {},
  totalAvaxInput: 0n,
  totalAvaxOutput: 0n,
  totalAvaxBurned: 0n,
  isValidAvaxBurnedAmount: true,
  ...overrides,
});

const createTransfer = (overrides: Partial<Transfer> = {}): Transfer => ({
  addresses: ['X-fuji1recipient'],
  amount: 100n,
  assetId: 'avaxAssetId',
  isNativeToken: true,
  symbol: 'AVAX',
  decimals: 9,
  threshold: 1,
  lockedUntil: 0,
  stakeableLockedUntil: 0,
  ...overrides,
});

const getTransfer = (tx: TxDetails) => {
  const [item] = valueDetailsSection(tx, 'AVAX')?.items ?? [];

  return typeof item === 'string' || item?.type !== DetailItemType.TRANSFER_LIST ? undefined : item.value;
};

describe('valueDetailsSection', () => {
  it('marks a transfer of the network token as native', () => {
    expect(getTransfer(valueDetails({ outputs: [createOutput()] }))?.[0]).toMatchObject({ isNativeToken: true });
  });

  it('marks a transfer of any other asset as not native', () => {
    const transfers = getTransfer(valueDetails({ outputs: [createOutput({ isAvax: false, assetId: 'tokenId' })] }));

    expect(transfers?.[0]).toMatchObject({ isNativeToken: false });
  });

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

  it('returns stake outputs as staked until the end of the staking period', () => {
    const tx: TxDetails = {
      ...valueDetails({ outputs: [createOutput({ isStake: true }), createOutput({ amount: 7n })] }),
      type: TxType.AddPermissionlessDelegator,
      nodeID: 'NodeID-1',
      subnetID: 'subnetId',
      stake: 100n,
      start: '1700000000',
      end: '1702592000',
      txFee: 0n,
    };

    expect(getTransfer(tx)).toStrictEqual([
      createTransfer({ isStaked: true, stakedUntil: 1702592000 }),
      createTransfer({ amount: 7n }),
    ]);
  });

  it('returns stake outputs of a validator as staked until the end of the staking period', () => {
    const tx: TxDetails = {
      ...valueDetails({ outputs: [createOutput({ isStake: true })] }),
      type: TxType.AddPermissionlessValidator,
      nodeID: 'NodeID-1',
      subnetID: 'subnetId',
      stake: 100n,
      delegationFee: 20000,
      start: '1700000000',
      end: '1702592000',
      txFee: 0n,
    };

    expect(getTransfer(tx)).toStrictEqual([createTransfer({ isStaked: true, stakedUntil: 1702592000 })]);
  });

  it('returns stake outputs of an auto-renewed validator as staked with no end date', () => {
    const tx: TxDetails = {
      ...valueDetails({ outputs: [createOutput({ isStake: true })] }),
      type: TxType.AddAutoRenewedValidator,
      nodeID: 'NodeID-1',
      stake: 100n,
      delegationFee: 20000,
      autoCompoundRewardShares: 0,
      period: 1209600n,
      txFee: 0n,
    };

    expect(getTransfer(tx)).toStrictEqual([createTransfer({ isStaked: true, stakedUntil: undefined })]);
  });

  it('returns outputs with no owners', () => {
    const transfers = getTransfer(valueDetails({ outputs: [createOutput({ owners: [] })] }));

    expect(transfers?.[0]).toMatchObject({ addresses: [], amount: 100n });
  });
});
