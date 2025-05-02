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
  type FundsRecipientItem,
  type AddressListItem,
  type NetworkItemValue,
  type NetworkItem,
} from '@avalabs/vm-module-types';

export const fundsRecipientItem = (
  address: string,
  amount: bigint,
  maxDecimals: number,
  symbol: string,
): FundsRecipientItem => ({
  type: DetailItemType.FUNDS_RECIPIENT,
  label: address,
  amount,
  maxDecimals,
  symbol,
});

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

export const addressListItem = (label: string, value: string[]): AddressListItem => ({
  label,
  type: DetailItemType.ADDRESS_LIST,
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

export const networkItem = (label: string, value: NetworkItemValue): NetworkItem => ({
  label,
  type: DetailItemType.NETWORK,
  value,
});
