import {
  type MessageTypeProperty,
  type MessageTypes,
  type TypedData,
  type TypedDataV1,
} from '@avalabs/vm-module-types';

/**
 * Detects EIP-712 message/domain values whose runtime JS type does not match their
 * declared Solidity type. Signing libraries (ethereumjs-abi/@metamask/eth-sig-util) and the
 * approval UI's display formatter independently coerce mismatched values, and they don't
 * always agree on the result (e.g. a non-empty string for a `bool` field is displayed
 * verbatim but signed as `true` via `!!value`). Any such mismatch means the signed digest
 * can diverge from what the user reviewed, so these must be rejected rather than displayed.
 */

const UINT_INT_TYPE = /^u?int(\d*)$/;
const BYTES_N_TYPE = /^bytes(\d+)$/;
const ARRAY_SUFFIX = /\[(\d*)\]$/;

const isCanonicalDecimalString = (value: string) => /^-?\d+$/.test(value);
const isHexString = (value: string) => /^0x[0-9a-fA-F]*$/.test(value);

// Returns a human-readable mismatch reason, or null if the value is fine (or the type
// isn't one we know how to validate, in which case we don't want false positives).
const primitiveTypeMismatch = (type: string, value: unknown): string | null => {
  if (type === 'bool') {
    return typeof value === 'boolean' ? null : `expected boolean, got ${JSON.stringify(value)}`;
  }

  if (type === 'string') {
    return typeof value === 'string' ? null : `expected string, got ${JSON.stringify(value)}`;
  }

  if (type === 'address') {
    return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value)
      ? null
      : `expected a 20-byte address, got ${JSON.stringify(value)}`;
  }

  if (UINT_INT_TYPE.test(type)) {
    if (typeof value === 'number' || typeof value === 'bigint') return null;
    if (typeof value === 'string' && (isCanonicalDecimalString(value) || isHexString(value))) return null;
    return `expected an integer for ${type}, got ${JSON.stringify(value)}`;
  }

  const bytesNMatch = BYTES_N_TYPE.exec(type);
  if (bytesNMatch) {
    const byteLength = Number(bytesNMatch[1]);
    return typeof value === 'string' && new RegExp(`^0x[0-9a-fA-F]{${byteLength * 2}}$`).test(value)
      ? null
      : `expected ${byteLength}-byte hex string for ${type}, got ${JSON.stringify(value)}`;
  }

  if (type === 'bytes') {
    return typeof value === 'string' && isHexString(value) && value.length % 2 === 0
      ? null
      : `expected a hex byte string, got ${JSON.stringify(value)}`;
  }

  // Unknown/unsupported primitive type - don't flag, let the existing ethers validation
  // handle whatever it can.
  return null;
};

const collectMismatches = (
  type: string,
  value: unknown,
  types: Record<string, MessageTypeProperty[]>,
  path: string,
  mismatches: string[],
) => {
  const arrayMatch = ARRAY_SUFFIX.exec(type);

  if (arrayMatch) {
    const elementType = type.slice(0, type.length - arrayMatch[0].length);

    if (!Array.isArray(value)) {
      mismatches.push(`${path}: expected array of ${elementType}, got ${JSON.stringify(value)}`);
      return;
    }

    value.forEach((item, index) => collectMismatches(elementType, item, types, `${path}[${index}]`, mismatches));
    return;
  }

  const structFields = types[type];

  if (structFields) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      mismatches.push(`${path}: expected struct ${type}, got ${JSON.stringify(value)}`);
      return;
    }

    for (const field of structFields) {
      collectMismatches(
        field.type,
        (value as Record<string, unknown>)[field.name],
        types,
        `${path}.${field.name}`,
        mismatches,
      );
    }
    return;
  }

  const mismatch = primitiveTypeMismatch(type, value);

  if (mismatch) {
    mismatches.push(`${path}: ${mismatch}`);
  }
};

/**
 * Walks the declared EIP-712 `types` graph for `primaryType` and reports every message field
 * whose value's runtime type doesn't match its declared Solidity type. Only `message` is
 * checked, not `domain`: the domain has no authority-bearing content and the existing ethers
 * validation intentionally tolerates minor domain mistakes (e.g. an empty verifyingContract)
 * for dApp compatibility - that leniency is preserved here.
 */
export const findEip712TypeMismatches = (data: TypedData<MessageTypes>): string[] => {
  const types = data.types as unknown as Record<string, MessageTypeProperty[]>;
  const mismatches: string[] = [];

  const primaryTypeFields = types[data.primaryType as string];

  if (primaryTypeFields) {
    for (const field of primaryTypeFields) {
      collectMismatches(field.type, data.message[field.name], types, `message.${field.name}`, mismatches);
    }
  }

  return mismatches;
};

/**
 * Same check as findEip712TypeMismatches, but for the legacy V1 typed-data format
 * (a flat array of { name, type, value }). V1 has no `types` registry - each entry declares
 * its own atomic Solidity type - but @metamask/eth-sig-util's V1 signer still performs the
 * same per-type coercion (e.g. bool via truthy, integers via BN parsing) as V3/V4, so the
 * same display/sign divergence applies here too.
 */
export const findEip712V1TypeMismatches = (data: TypedDataV1): string[] => {
  const mismatches: string[] = [];

  for (const item of data) {
    const mismatch = primitiveTypeMismatch(item.type, item.value);

    if (mismatch) {
      mismatches.push(`${item.name}: ${mismatch}`);
    }
  }

  return mismatches;
};
