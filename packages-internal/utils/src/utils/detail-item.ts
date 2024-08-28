import {
  type AddressItem,
  type CurrencyItem,
  type NodeIDItem,
  type TextItem,
  type DataItem,
  type DateItem,
  type LinkItemValue,
  DetailItemType,
  type LinkItem,
} from '@avalabs/vm-module-types';

export const currencyItem = (label: string, value: bigint, maxDecimals: number, symbol: string): CurrencyItem => ({
  label,
  type: DetailItemType.CURRENCY,
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
  type: DetailItemType.TEXT,
  value,
});

export const linkItem = (label: string, value: LinkItemValue): LinkItem => ({
  label,
  value,
  type: DetailItemType.LINK,
});

export const addressItem = (label: string, value: string): AddressItem => ({
  label,
  type: DetailItemType.ADDRESS,
  value,
});

export const nodeIDItem = (label: string, value: string): NodeIDItem => ({
  label,
  type: DetailItemType.NODE_ID,
  value,
});

export const dataItem = (label: string, value: string): DataItem => ({
  label,
  type: DetailItemType.DATA,
  value,
});

export const dateItem = (label: string, value: string): DateItem => ({
  label,
  type: DetailItemType.DATE,
  value,
});
