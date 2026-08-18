import { networkIDs, pvmSerial, utils } from '@avalabs/avalanchejs';
import { TxType, type TxDetails } from '@avalabs/vm-module-types';

/**
 * Reads the ownership fields that a P-Chain approval signs but never showed.
 *
 * Each detail section hand-picks the fields it renders, so anything a section forgets is
 * signed blind. Two shapes of gap are covered here:
 *
 *  - The parser already extracts the field and the section drops it - the staking reward
 *    owners, which decide where staking rewards and the returned stake are paid. These are
 *    plain output owners chosen by whoever built the request, so redirecting them is not
 *    gated by anything.
 *  - The parser never extracts the field at all - the L1 warp payloads. `RegisterL1Validator`
 *    carries the addresses that can claim the validator's remaining balance and disable it,
 *    and `SetL1ValidatorWeight` carries the validator being retargeted and its new weight
 *    (a weight of zero evicts it). Both live inside the transaction's warp message, so they
 *    are read straight from the signed bytes.
 *
 * Nothing here throws: an approval that cannot render is worse than one that renders what it
 * can. When a payload is present but undecodable the caller is told so explicitly
 * (`decodeFailed`) rather than being handed an empty list, because "no owner" and "an owner
 * we could not read" mean very different things to someone about to sign.
 */

export type OwnerDetail = {
  addresses: string[];
  /** Signatures required to spend. Only meaningful alongside more than one address. */
  threshold?: number;
};

export type SignedOwnerDetails = {
  /** AddPermissionlessValidator / AddAutoRenewedValidator - where staking rewards are paid. */
  rewardOwner?: OwnerDetail;
  /** Where rewards earned from delegations to this validator are paid. */
  delegationRewardOwner?: OwnerDetail;
  /** AddAutoRenewedValidator - who controls the validator itself. */
  validatorAuthority?: OwnerDetail;
  /** RegisterL1Validator - who can claim the validator's leftover balance. */
  remainingBalanceOwner?: OwnerDetail;
  /** RegisterL1Validator - who can disable the validator. */
  disableOwner?: OwnerDetail;
  /** RegisterL1Validator - which subnet the validator joins. */
  subnetId?: string;
  /** RegisterL1Validator / SetL1ValidatorWeight - the validator's weight in the L1. */
  weight?: bigint;
  /** SetL1ValidatorWeight - which validator is being retargeted. */
  validationId?: string;
  /** A warp payload was present but could not be decoded - say so instead of showing nothing. */
  decodeFailed?: boolean;
};

const P_CHAIN_ALIAS = 'P';

type AddressLike = { toBytes: () => Uint8Array };

// `OutputOwners` (staking) calls the field `addrs`, `PChainOwner` (warp) calls it `addresses`.
type OwnerLike = { addrs?: unknown; addresses?: unknown; threshold?: { value?: () => unknown } };

const getHrp = (isTestnet: boolean): string => networkIDs.getHRP(isTestnet ? networkIDs.FujiID : networkIDs.MainnetID);

const isAddressLike = (value: unknown): value is AddressLike => typeof (value as AddressLike)?.toBytes === 'function';

const toOwnerDetail = (owner: unknown, hrp: string): OwnerDetail | undefined => {
  const candidate = owner as OwnerLike | null | undefined;
  const rawAddresses = candidate?.addrs ?? candidate?.addresses;

  if (!Array.isArray(rawAddresses)) {
    return undefined;
  }

  const addresses = rawAddresses
    .filter(isAddressLike)
    .map((address) => utils.format(P_CHAIN_ALIAS, hrp, address.toBytes()));

  if (addresses.length === 0) {
    return undefined;
  }

  const rawThreshold = candidate?.threshold?.value?.();
  const threshold = typeof rawThreshold === 'number' ? rawThreshold : undefined;

  return { addresses, threshold };
};

/**
 * Unwraps `WarpMessage -> AddressedCall -> payload` and hands the payload bytes back.
 * Returns undefined for anything that is not the shape we expect.
 */
const getAddressedCallPayload = (message: unknown): Uint8Array | undefined => {
  const bytes = (message as { toBytes?: () => Uint8Array } | undefined)?.toBytes?.();

  if (!bytes || bytes.length === 0) {
    return undefined;
  }

  const [warpMessage] = pvmSerial.warp.WarpMessage.fromBytes(bytes, pvmSerial.warp.codec);
  const [addressedCall] = pvmSerial.warp.AddressedCallPayloads.AddressedCall.fromBytes(
    warpMessage.unsignedMessage.payload.toBytes(),
    pvmSerial.warp.codec,
  );

  return addressedCall.payload.toBytes();
};

const getRegisterL1ValidatorDetails = (tx: unknown, hrp: string): SignedOwnerDetails => {
  try {
    const payload = getAddressedCallPayload((tx as { message?: unknown })?.message);

    if (!payload) {
      return {};
    }

    const [message] = pvmSerial.warp.AddressedCallPayloads.RegisterL1ValidatorMessage.fromBytes(
      payload,
      pvmSerial.warp.codec,
    );

    return {
      remainingBalanceOwner: toOwnerDetail(message.getRemainingBalanceOwner(), hrp),
      disableOwner: toOwnerDetail(message.getDisableOwner(), hrp),
      subnetId: message.getSubnetId(),
      weight: message.getWeight(),
    };
  } catch {
    return { decodeFailed: true };
  }
};

const getSetL1ValidatorWeightDetails = (tx: unknown): SignedOwnerDetails => {
  try {
    const payload = getAddressedCallPayload((tx as { message?: unknown })?.message);

    if (!payload) {
      return {};
    }

    const [message] = pvmSerial.warp.AddressedCallPayloads.L1ValidatorWeightMessage.fromBytes(
      payload,
      pvmSerial.warp.codec,
    );

    return {
      validationId: message.getValidationId(),
      weight: message.getWeight(),
    };
  } catch {
    return { decodeFailed: true };
  }
};

/**
 * The staking reward owners are already on the parsed details - they are just never
 * destructured by the sections. They are read off `txDetails` structurally so this does not
 * have to track the wallet SDK's parser return types.
 */
const getStakingOwnerDetails = (txDetails: TxDetails, hrp: string): SignedOwnerDetails => {
  const parsed = txDetails as unknown as {
    rewardOwner?: unknown;
    delegationRewardOwner?: unknown;
    delegatorRewardsOwner?: unknown;
    owner?: unknown;
  };

  return {
    rewardOwner: toOwnerDetail(parsed.rewardOwner, hrp),
    // AddPermissionlessValidator calls it `delegationRewardOwner`; the delegator transaction
    // calls its single owner `delegatorRewardsOwner`.
    delegationRewardOwner: toOwnerDetail(parsed.delegationRewardOwner ?? parsed.delegatorRewardsOwner, hrp),
    validatorAuthority: toOwnerDetail(parsed.owner, hrp),
  };
};

export const getSignedOwnerDetails = (
  tx: object,
  txDetails: TxDetails,
  isTestnet: boolean,
): SignedOwnerDetails | undefined => {
  const hrp = getHrp(isTestnet);

  switch (txDetails.type) {
    case TxType.AddPermissionlessValidator:
    case TxType.AddPermissionlessDelegator:
    case TxType.AddAutoRenewedValidator:
      return getStakingOwnerDetails(txDetails, hrp);
    case TxType.RegisterL1Validator:
      return getRegisterL1ValidatorDetails(tx, hrp);
    case TxType.SetL1ValidatorWeight:
      return getSetL1ValidatorWeightDetails(tx);
    default:
      return undefined;
  }
};
