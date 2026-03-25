import startCase from 'lodash.startcase';

/** Moralis `method_label` is often a decoded name, sometimes with a `(args…)` suffix. */
export function parseMoralisMethodLabel(methodLabel: string | undefined): string {
  const raw = methodLabel ?? '';
  if (raw.includes('(')) {
    return startCase(raw.split('(', 1)[0]);
  }
  return raw;
}

export function normalizeMoralisMethodLabelCompact(methodLabel: string | undefined): string {
  return parseMoralisMethodLabel(methodLabel).toLowerCase().replace(/\s+/g, '');
}
