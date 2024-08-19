import type { AddressItem, CurrencyItem, NodeIDItem, TextItem, DataItem, DateItem } from '@avalabs/vm-module-types';

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

export const dateItem = (label: string, value: string): DateItem => ({
  label,
  type: 'date',
  value,
});
