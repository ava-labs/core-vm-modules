import { addIdToPromise, settleAllIdPromises } from './id-promise';

describe('addIdToPromise', () => {
  it('should resolve with fulfilled status and value', async () => {
    const promise = Promise.resolve('test-value');
    const id = '123';

    const result = await addIdToPromise(promise, id);

    expect(result).toEqual({
      id,
      status: 'fulfilled',
      value: 'test-value',
    });
  });

  it('should resolve with rejected status and reason', async () => {
    const promise = Promise.reject('test-reason');
    const id = '123';

    const result = await addIdToPromise(promise, id);

    expect(result).toEqual({
      id,
      status: 'rejected',
      reason: 'test-reason',
    });
  });
});

describe('waitForIdPromises', () => {
  it('should return a record of fulfilled promises', async () => {
    const promises = [
      addIdToPromise(Promise.resolve('value1'), 'id1'),
      addIdToPromise(Promise.resolve('value2'), 'id2'),
    ];

    const result = await settleAllIdPromises(promises);

    expect(result).toEqual({
      id1: 'value1',
      id2: 'value2',
    });
  });

  it('should return a record of rejected promises', async () => {
    const promises = [addIdToPromise(Promise.reject('error1'), 'id1'), addIdToPromise(Promise.reject('error2'), 'id2')];

    const result = await settleAllIdPromises(promises);

    expect(result).toEqual({
      id1: { error: 'error1' },
      id2: { error: 'error2' },
    });
  });

  it('should handle mixed fulfilled and rejected promises', async () => {
    const promises = [
      addIdToPromise(Promise.resolve('value1'), 'id1'),
      addIdToPromise(Promise.reject('error2'), 'id2'),
      addIdToPromise(Promise.resolve('value3'), 'id3'),
    ];

    const result = await settleAllIdPromises(promises);

    expect(result).toEqual({
      id1: 'value1',
      id2: { error: 'error2' },
      id3: 'value3',
    });
  });
});
