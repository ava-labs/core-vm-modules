import { NetworkVMType, TxType } from '@avalabs/vm-module-types';

import { getSignedOwnerDetails } from './get-signed-owner-details';

// Fixed owner bytes and the bech32 they encode to, so the formatting is asserted against
// literals rather than against the same call the implementation makes.
const OWNER_BYTES = new Uint8Array(20).fill(1);
const OTHER_OWNER_BYTES = new Uint8Array(20).fill(2);

const OWNER_P = 'P-avax1qyqszqgpqyqszqgpqyqszqgpqyqszqgp83vh5p';
const OTHER_OWNER_P = 'P-avax1qgpqyqszqgpqyqszqgpqyqszqgpqyqszk42jlh';
const OWNER_P_FUJI = 'P-fuji1qyqszqgpqyqszqgpqyqszqgpqyqszqgptrggc7';

const feeData = {
  totalAvaxBurned: 1n,
  totalAvaxOutput: 1n,
  totalAvaxInput: 2n,
  isValidAvaxBurnedAmount: true,
  txFee: 1n,
};

/** Stands in for an avalanchejs `OutputOwners`/`PChainOwner` without pulling in the codec. */
const owner = (bytes: Uint8Array[], threshold: number) => ({
  addrs: bytes.map((value) => ({ toBytes: () => value })),
  threshold: { value: () => threshold },
});

const withMessage = (payload: Uint8Array) => ({ message: { toBytes: () => payload } });

describe('getSignedOwnerDetails', () => {
  describe('staking reward owners', () => {
    it('formats the validator and delegation reward owners the section never showed', () => {
      const txDetails = {
        type: TxType.AddPermissionlessValidator,
        rewardOwner: owner([OWNER_BYTES], 1),
        delegationRewardOwner: owner([OWNER_BYTES, OTHER_OWNER_BYTES], 2),
      } as never;

      const details = getSignedOwnerDetails({}, txDetails, false);

      expect(details?.rewardOwner).toEqual({ addresses: [OWNER_P], threshold: 1 });
      expect(details?.delegationRewardOwner).toEqual({
        addresses: [OWNER_P, OTHER_OWNER_P],
        threshold: 2,
      });
    });

    it('reads the delegator transaction owner from its own field name', () => {
      const txDetails = {
        type: TxType.AddPermissionlessDelegator,
        delegatorRewardsOwner: owner([OWNER_BYTES], 1),
      } as never;

      expect(getSignedOwnerDetails({}, txDetails, false)?.delegationRewardOwner).toEqual({
        addresses: [OWNER_P],
        threshold: 1,
      });
    });

    it('reads all three owner sets of an auto-renewed validator', () => {
      const txDetails = {
        type: TxType.AddAutoRenewedValidator,
        owner: owner([OWNER_BYTES], 1),
        rewardOwner: owner([OTHER_OWNER_BYTES], 1),
        delegationRewardOwner: owner([OWNER_BYTES], 1),
      } as never;

      const details = getSignedOwnerDetails({}, txDetails, false);

      expect(details?.validatorAuthority?.addresses).toEqual([OWNER_P]);
      expect(details?.rewardOwner?.addresses).toEqual([OTHER_OWNER_P]);
      expect(details?.delegationRewardOwner?.addresses).toEqual([OWNER_P]);
    });

    it('uses the testnet hrp when the network is a testnet', () => {
      const txDetails = {
        type: TxType.AddPermissionlessValidator,
        rewardOwner: owner([OWNER_BYTES], 1),
      } as never;

      expect(getSignedOwnerDetails({}, txDetails, true)?.rewardOwner?.addresses).toEqual([OWNER_P_FUJI]);
    });

    it('returns no owner rather than an empty one when the field is missing', () => {
      const txDetails = { type: TxType.AddPermissionlessValidator } as never;
      const details = getSignedOwnerDetails({}, txDetails, false);

      expect(details?.rewardOwner).toBeUndefined();
      expect(details?.delegationRewardOwner).toBeUndefined();
    });
  });

  describe('L1 warp payloads', () => {
    const registerTx = { type: TxType.RegisterL1Validator, chain: NetworkVMType.PVM, balance: 1n, ...feeData } as never;
    const weightTx = { type: TxType.SetL1ValidatorWeight, chain: NetworkVMType.PVM, ...feeData } as never;

    it('reports a decode failure instead of silently showing nothing', () => {
      expect(getSignedOwnerDetails(withMessage(new Uint8Array([1, 2, 3])), registerTx, false)).toEqual({
        decodeFailed: true,
      });
    });

    it('does not flag a decode failure when there is no payload at all', () => {
      expect(getSignedOwnerDetails(withMessage(new Uint8Array()), registerTx, false)).toEqual({});
    });

    it('reports a decode failure for an unreadable SetL1ValidatorWeight payload', () => {
      expect(getSignedOwnerDetails(withMessage(new Uint8Array([9, 9, 9])), weightTx, false)).toEqual({
        decodeFailed: true,
      });
    });
  });

  it('returns undefined for a transaction type with no hidden ownership fields', () => {
    const txDetails = {
      type: TxType.Import,
      source: NetworkVMType.AVM,
      chain: NetworkVMType.PVM,
      amount: 1n,
      txFee: 1n,
    } as never;

    expect(getSignedOwnerDetails({}, txDetails, false)).toBeUndefined();
  });
});
