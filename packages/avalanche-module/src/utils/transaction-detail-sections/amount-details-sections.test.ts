import { DetailItemType, type TxOutput, type TxValueDetails } from '@avalabs/vm-module-types';
import { amountDetailsSections } from './amount-details-sections';

const AVAX_ASSET_ID = 'avaxAssetId';

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

const getSection = (tx: TxValueDetails) => amountDetailsSections(tx, 'AVAX', AVAX_ASSET_ID);

describe('amountDetailsSections', () => {
  it('returns a section for input and output amounts', () => {
    const sections = getSection(
      valueDetails({
        inputAmounts: { [AVAX_ASSET_ID]: 3n },
        outputAmounts: { [AVAX_ASSET_ID]: 2n },
      }),
    );

    expect(sections.map(({ title }) => title)).toEqual(['Input amounts', 'Output amounts']);
  });

  it('returns no sections when the transaction does not have any transfers', () => {
    expect(getSection(valueDetails())).toEqual([]);
  });

  it('returns all assets and their amounts', () => {
    const [inputs] = getSection(
      valueDetails({
        inputAmounts: { [AVAX_ASSET_ID]: 3n, tokenId: 7n, otherId: 9n },
      }),
    );

    expect(inputs?.items).toHaveLength(3);
  });

  it('uses the proper denomination for the network token', () => {
    const [inputs] = getSection(valueDetails({ inputAmounts: { [AVAX_ASSET_ID]: 3n } }));

    expect(inputs?.items[0]).toEqual({
      label: 'AVAX',
      type: DetailItemType.CURRENCY,
      value: 3n,
      maxDecimals: 9,
      symbol: 'AVAX',
    });
  });

  it('uses the proper description for non-AVAX assets', () => {
    const [inputs] = getSection(
      valueDetails({
        inputAmounts: { tokenId: 7n },
        outputs: [
          createOutput({
            isAvax: false,
            assetId: 'tokenId',
            assetDescription: { assetID: 'tokenId', name: 'Some Token', symbol: 'TKN', denomination: 2 },
          }),
        ],
      }),
    );

    expect(inputs?.items[0]).toMatchObject({
      label: 'Some Token',
      type: DetailItemType.CURRENCY,
      value: 7n,
      maxDecimals: 2,
      symbol: 'TKN',
    });
  });

  it('returns the amount only for assets without a description', () => {
    const [inputs] = getSection(valueDetails({ inputAmounts: { tokenId: 7n } }));

    expect(inputs?.items[0]).toMatchObject({
      label: 'tokenId',
      type: DetailItemType.TEXT,
      value: '7',
    });
  });
});
