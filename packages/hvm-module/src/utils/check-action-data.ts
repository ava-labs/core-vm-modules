import type { ActionData, VMABI } from 'hypersdk-client';

const UINT_INT_TYPE = /^(u?)int(\d+)$/;
const SLICE_PREFIX = /^\[\]/;
const FIXED_ARRAY_TYPE = /^\[(\d+)\](.+)$/;

const isCanonicalDecimalString = (value: string) => /^-?\d+$/.test(value);
const isHexString = (value: string) => /^0x[0-9a-fA-F]+$/.test(value);
const isBase64String = (value: string) => /^[A-Za-z0-9+/]*={0,2}$/.test(value) && value.length % 4 === 0;

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

// Describes the value with its runtime type, so `'true'` does not read the same as `true`.
const describeValue = (value: unknown): string => {
  const valueType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;

  try {
    // JSON.stringify returns undefined for `undefined`, symbols and functions, and throws on bigint.
    return `${JSON.stringify(value) ?? String(value)} (${valueType})`;
  } catch {
    return `${String(value)} (${valueType})`;
  }
};

const primitiveTypeMismatch = (type: string, value: unknown): string | null => {
  if (type === 'bool') {
    return typeof value === 'boolean' ? null : `expected boolean, got ${describeValue(value)}`;
  }

  if (type === 'string') {
    return typeof value === 'string' ? null : `expected string, got ${describeValue(value)}`;
  }

  if (type === 'Address') {
    return typeof value === 'string' && /^0x[0-9a-fA-F]{74}$/.test(value)
      ? null
      : `expected a 37-byte hex address, got ${describeValue(value)}`;
  }

  if (type === '[]uint8') {
    // Byte slices are marshaled from base64 (`atob`), not from hex or a plain array.
    return typeof value === 'string' && isBase64String(value)
      ? null
      : `expected a base64 encoded byte string, got ${describeValue(value)}`;
  }

  const uintIntMatch = UINT_INT_TYPE.exec(type);

  if (uintIntMatch) {
    const integerValue = toIntegerValue(value);

    if (integerValue === null) {
      return `expected an integer for ${type}, got ${describeValue(value)}`;
    }

    const isUnsigned = uintIntMatch[1] === 'u';
    const bitWidth = Number(uintIntMatch[2]);
    // BigInt exponentiation, since the widths go up to 2 ** 256 and number arithmetic
    // loses precision past 2 ** 53.
    const [min, max] = isUnsigned
      ? [0n, 2n ** BigInt(bitWidth) - 1n]
      : [-(2n ** BigInt(bitWidth - 1)), 2n ** BigInt(bitWidth - 1) - 1n];

    // Check bounds
    return integerValue < min || integerValue > max
      ? `expected a value in the ${type} range, got ${describeValue(value)}`
      : null;
  }

  // Unknown primitive - don't flag, we can't say anything useful about it.
  return null;
};

const collectMismatches = (
  type: string,
  value: unknown,
  types: VMABI['types'],
  path: string,
  mismatches: string[],
): void => {
  const fixedArrayMatch = FIXED_ARRAY_TYPE.exec(type);

  if (fixedArrayMatch) {
    const declaredLength = Number(fixedArrayMatch[1]);
    const elementType = fixedArrayMatch[2] as string;

    if (!Array.isArray(value)) {
      mismatches.push(`${path}: expected array of ${elementType}, got ${describeValue(value)}`);
      return;
    }

    if (value.length !== declaredLength) {
      mismatches.push(`${path}: expected ${declaredLength} elements for ${type}, got ${value.length}`);
      return;
    }

    value.forEach((item, index) => collectMismatches(elementType, item, types, `${path}[${index}]`, mismatches));
    return;
  }

  // `[]uint8` is a byte string rather than a slice of numbers, so it is handled as a primitive.
  if (SLICE_PREFIX.test(type) && type !== '[]uint8') {
    const elementType = type.replace(SLICE_PREFIX, '');

    if (!Array.isArray(value)) {
      mismatches.push(`${path}: expected array of ${elementType}, got ${describeValue(value)}`);
      return;
    }

    value.forEach((item, index) => collectMismatches(elementType, item, types, `${path}[${index}]`, mismatches));
    return;
  }

  const structType = types.find(({ name }) => name === type);

  if (structType) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      mismatches.push(`${path}: expected an object for ${type}, got ${describeValue(value)}`);
      return;
    }

    collectStructMismatches(structType.fields, value as Record<string, unknown>, types, path, mismatches);
    return;
  }

  const mismatch = primitiveTypeMismatch(type, value);

  if (mismatch) {
    mismatches.push(`${path}: ${mismatch}`);
  }
};

const collectStructMismatches = (
  fields: VMABI['types'][number]['fields'],
  data: Record<string, unknown>,
  types: VMABI['types'],
  path: string,
  mismatches: string[],
): void => {
  for (const field of fields) {
    if (!(field.name in data)) {
      mismatches.push(`${path}.${field.name}: missing, it would be signed as a zero value without being displayed`);
      continue;
    }

    collectMismatches(field.type, data[field.name], types, `${path}.${field.name}`, mismatches);
  }

  for (const key of Object.keys(data)) {
    if (!fields.some((field) => field.name === key)) {
      mismatches.push(`${path}.${key}: not declared in the chain ABI, it would be displayed but not signed`);
    }
  }
};

// Finds mismatches between the provided action data and the chain ABI.
export const findActionDataMismatches = (actions: ActionData[], abi: VMABI): string[] => {
  const mismatches: string[] = [];

  actions.forEach((action, index) => {
    const path = `actions[${index}] (${action.actionName})`;

    // Check that the action exists in the ABI and that its data matches the expected types.
    if (!abi.actions.some(({ name }) => name === action.actionName)) {
      mismatches.push(`${path}: this action does not exist on this chain`);
      return;
    }

    const actionType = abi.types.find(({ name }) => name === action.actionName);

    if (!actionType) {
      mismatches.push(`${path}: the chain ABI has no field definition for this action`);
      return;
    }

    collectStructMismatches(actionType.fields, action.data, abi.types, path, mismatches);
  });

  return mismatches;
};
