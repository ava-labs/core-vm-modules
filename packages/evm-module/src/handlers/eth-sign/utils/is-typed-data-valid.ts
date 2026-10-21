import { type TypedData, type MessageTypes, type TypedDataV1 } from '@avalabs/vm-module-types';
import { TypedDataEncoder } from 'ethers';
import { findEip712TypeMismatches, findEip712V1TypeMismatches } from './eip712-type-check';

type Result = { isValid: true } | { isValid: false; error: unknown; blocking: boolean };

const HYPERLIQUID_USER_SIGNED_CHAIN_ID = 421614n; // Fixed by Hyperliquid's user-signed action protocol.
const HYPERLIQUID_L1_CHAIN_ID = 1337n; // Fixed by Hyperliquid's L1 Agent signing protocol.
const HYPERLIQUID_VERIFYING_CONTRACT = '0x0000000000000000000000000000000000000000'; // Hyperliquid's EIP-712 verifier.

const parseChainId = (chainId: unknown): bigint | undefined => {
  if (typeof chainId !== 'number' && typeof chainId !== 'string' && typeof chainId !== 'bigint') {
    return undefined;
  }

  try {
    return BigInt(chainId);
  } catch {
    return undefined;
  }
};

const isHyperliquidDomainException = (data: TypedData<MessageTypes>): boolean => {
  const { domain, primaryType } = data;
  const domainChainId = parseChainId(domain.chainId);

  if (
    domain.version !== '1' ||
    typeof domain.verifyingContract !== 'string' ||
    domain.verifyingContract.toLowerCase() !== HYPERLIQUID_VERIFYING_CONTRACT ||
    typeof primaryType !== 'string'
  ) {
    return false;
  }

  return (
    (domain.name === 'HyperliquidSignTransaction' &&
      domainChainId === HYPERLIQUID_USER_SIGNED_CHAIN_ID &&
      primaryType.startsWith('HyperliquidTransaction:')) ||
    (domain.name === 'Exchange' && domainChainId === HYPERLIQUID_L1_CHAIN_ID && primaryType === 'Agent')
  );
};

// Every EIP-712 domain field is optional (https://eips.ethereum.org/EIPS/eip-712#definition-of-domainseparator),
// so a domain without a chainId (e.g. an off-chain ToS acceptance) is not bound to any chain and is accepted.
// Nullish counts as absent, matching how ethers skips nullish domain fields when hashing.
const isDomainBoundToAnotherChain = (domainChainId: unknown, chainId: number): boolean => {
  if (domainChainId === undefined || domainChainId === null) {
    return false;
  }

  return parseChainId(domainChainId) !== BigInt(chainId);
};

const formatDomainChainId = (chainId: unknown): string => {
  try {
    return JSON.stringify(chainId) ?? String(chainId);
  } catch {
    return String(chainId);
  }
};

export const isTypedDataValid = (data: TypedData<MessageTypes>, chainId: number): Result => {
  if (!isHyperliquidDomainException(data) && isDomainBoundToAnotherChain(data.domain.chainId, chainId)) {
    return {
      isValid: false,
      error: new Error(
        `EIP-712 domain chainId (${formatDomainChainId(
          data.domain.chainId,
        )}) does not match the requested network (${chainId})`,
      ),
      blocking: true,
    };
  }

  // Check for type mismatches in the message fields, which is a blocking error.
  const typeMismatches = findEip712TypeMismatches(data);

  if (typeMismatches.length > 0) {
    return {
      isValid: false,
      error: new Error(`EIP-712 message contains fields with a type mismatch: ${typeMismatches.join('; ')}`),
      blocking: true,
    };
  }

  try {
    // ethers.js will throw if the message is invalid in any other way (e.g. missing required fields, invalid domain, etc.)
    // remove EIP712Domain from types since ethers.js handles it separately
    const { EIP712Domain, ...types } = data.types;
    TypedDataEncoder.getPayload(data.domain, types, data.message);

    return {
      isValid: true,
    };
  } catch (e) {
    return {
      isValid: false,
      error: e,
      blocking: false,
    };
  }
};

// Check for mismatched types in legacy v1-style typed data
export const isTypedDataV1Valid = (data: TypedDataV1): Result => {
  const typeMismatches = findEip712V1TypeMismatches(data);

  if (typeMismatches.length > 0) {
    return {
      isValid: false,
      error: new Error(`Typed data contains fields with a type mismatch: ${typeMismatches.join('; ')}`),
      blocking: true,
    };
  }

  return { isValid: true };
};
