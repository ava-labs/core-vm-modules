import type { AddressItem, CurrencyItem, NodeIDItem, TextItem, DataItem } from '@avalabs/vm-module-types';

export const currencyItem = (label: string, value: bigint, maxDecimals: number, symbol: string): CurrencyItem => ({
  label,
  type: 'currency',
  value,
  maxDecimals,
  symbol,
});

export const textItem = (
  label: string,
  value: string,
  alignment: 'horizontal' | 'vertical' = 'horizontal',
): TextItem => ({
  label,
  alignment,
  type: 'text',
  value,
});

export const addressItem = (label: string, value: string): AddressItem => ({
  label,
  type: 'address',
  value,
});

export const nodeIDItem = (label: string, value: string): NodeIDItem => ({
  label,
  type: 'nodeID',
  value,
});

export const dataItem = (label: string, value: string): DataItem => ({
  label,
  type: 'data',
  value,
});
