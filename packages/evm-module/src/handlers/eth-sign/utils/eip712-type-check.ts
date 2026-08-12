import {
  type MessageTypeProperty,
  type MessageTypes,
  type TypedData,
  type TypedDataV1,
} from '@avalabs/vm-module-types';

const UINT_INT_TYPE = /^(u?)int(\d*)$/;
const BYTES_N_TYPE = /^bytes(\d+)$/;
const ARRAY_SUFFIX = /\[(\d*)\]$/;

const isCanonicalDecimalString = (value: string) => /^-?\d+$/.test(value);
const isHexString = (value: string) => /^0x[0-9a-fA-F]*$/.test(value);

const toIntegerValue = (value: unknown): bigint | null => {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return Number.isSafeInteger(value) ? BigInt(value) : null;

  if (typeof value === 'string' && (isCanonicalDecimalString(value) || isHexString(value))) {
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }

  return null;
};

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

  const uintIntMatch = UINT_INT_TYPE.exec(type);

  if (uintIntMatch) {
    const integerValue = toIntegerValue(value);

    if (integerValue === null) {
      return `expected an integer for ${type}, got ${JSON.stringify(value)}`;
    }

    // `uint`/`int` without an explicit width mean 256 bits.
    const isUnsigned = uintIntMatch[1] === 'u';
    const bitWidth = uintIntMatch[2] ? Number(uintIntMatch[2]) : 256;
    const [min, max] = isUnsigned
      ? [0n, (1n << BigInt(bitWidth)) - 1n]
      : [-(1n << BigInt(bitWidth - 1)), (1n << BigInt(bitWidth - 1)) - 1n];

    return integerValue < min || integerValue > max
      ? `expected a value in the ${type} range, got ${JSON.stringify(value)}`
      : null;
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

    // A fixed-size array declares its length as part of the type, and the signing libraries
    // encode exactly that many elements - anything else changes what gets signed.
    const declaredLength = arrayMatch[1] ? Number(arrayMatch[1]) : undefined;

    if (declaredLength !== undefined && value.length !== declaredLength) {
      mismatches.push(`${path}: expected ${declaredLength} elements for ${type}, got ${value.length}`);
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

// Check for mismatched types in v3/v4-style typed data
export const findEip712TypeMismatches = (data: TypedData<MessageTypes>): string[] => {
  // `types` is typed as required, but this runs on dApp-supplied input that may be missing it.
  const types = (data.types ?? {}) as unknown as Record<string, MessageTypeProperty[]>;
  const mismatches: string[] = [];

  const primaryTypeFields = types[data.primaryType as string];

  if (!primaryTypeFields) {
    return [`primaryType "${String(data.primaryType)}" is not defined in the message types`];
  }

  for (const field of primaryTypeFields) {
    collectMismatches(field.type, data.message[field.name], types, `message.${field.name}`, mismatches);
  }

  return mismatches;
};

// Check for mismatched types in v1-style typed data
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
