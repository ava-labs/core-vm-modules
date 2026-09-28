import { DetailItemType, type TxOutput, type TxValueDetails } from '@avalabs/vm-module-types';
import { spendDetailsSection } from './spend-details-section';
import type { TransactionSpendDetails } from '../get-transaction-spend-details';

const AVAX_ASSET_ID = 'avaxAssetId';
const TOKEN_ASSET_ID = 'tokenId';

const createOutput = (overrides: Partial<TxOutput> = {}): TxOutput => ({
  assetId: AVAX_ASSET_ID,
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
  isValidAvaxBurnedAmount: true,
  ...overrides,
});

const createSpendDetails = (spentAmounts: Record<string, bigint>): TransactionSpendDetails => ({
  spentAmounts,
  unknownAddresses: [],
});

const getSection = (spentAmounts: Record<string, bigint>, tx: TxValueDetails = valueDetails()) =>
  spendDetailsSection(tx, createSpendDetails(spentAmounts), 'AVAX', AVAX_ASSET_ID);

describe('spendDetailsSection', () => {
  it('returns undefined when the transaction spends nothing', () => {
    expect(getSection({})).toBeUndefined();
  });

  it('returns the correct title', () => {
    expect(getSection({ [AVAX_ASSET_ID]: 100n })?.title).toEqual('You spend');
  });

  it('returns an item for each asset spent', () => {
    const section = getSection({ [AVAX_ASSET_ID]: 100n, [TOKEN_ASSET_ID]: 7n, otherId: 9n });

    expect(section?.items).toHaveLength(3);
  });

  it('uses the correct details for AVAX transfers', () => {
    expect(getSection({ [AVAX_ASSET_ID]: 100n })?.items[0]).toEqual({
      label: 'AVAX',
      type: DetailItemType.CURRENCY,
      value: 100n,
      maxDecimals: 9,
      symbol: 'AVAX',
    });
  });

  it('uses the correct details for non-AVAX transfers', () => {
    const tx = valueDetails({
      outputs: [
        createOutput({
          isAvax: false,
          assetId: TOKEN_ASSET_ID,
          assetDescription: { assetID: TOKEN_ASSET_ID, name: 'Some Token', symbol: 'TKN', denomination: 2 },
        }),
      ],
    });

    expect(getSection({ [TOKEN_ASSET_ID]: 7n }, tx)?.items[0]).toMatchObject({
      label: 'Some Token',
      type: DetailItemType.CURRENCY,
      value: 7n,
      maxDecimals: 2,
      symbol: 'TKN',
    });
  });

  it('returns non-AVAX raw amounts when details are missing', () => {
    expect(getSection({ [TOKEN_ASSET_ID]: 7n })?.items[0]).toMatchObject({
      label: TOKEN_ASSET_ID,
      type: DetailItemType.TEXT,
      value: '7',
    });
  });
});
