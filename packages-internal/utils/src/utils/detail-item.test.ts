import { DetailItemType } from '@avalabs/vm-module-types';

import { dateItem, MAX_DATE_SECONDS } from './detail-item';

describe('dateItem', () => {
  it('returns a date item for a timestamp', () => {
    expect(dateItem('End', '1692234567')).toStrictEqual({
      label: 'End',
      type: DetailItemType.DATE,
      value: '1692234567',
    });
  });

  it('returns a date item up to the latest representable date', () => {
    expect(dateItem('End', MAX_DATE_SECONDS.toString())).toStrictEqual({
      label: 'End',
      type: DetailItemType.DATE,
      value: MAX_DATE_SECONDS.toString(),
    });
  });

  it('returns an indefinite text item past the latest representable date', () => {
    expect(dateItem('End', (2n ** 64n - 1n).toString())).toStrictEqual({
      label: 'End',
      type: DetailItemType.TEXT,
      value: 'Indefinitely',
      alignment: 'horizontal',
    });
  });
});
