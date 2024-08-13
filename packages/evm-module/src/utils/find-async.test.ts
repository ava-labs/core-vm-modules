import { findAsync } from './find-async';

// Helper function to simulate async checks
const checkIfEven = async (item: number, delay: number = 100) => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  return item % 2 === 0;
};

describe('findAsync', () => {
  it('should find the first even number in the array', async () => {
    const array = [1, 3, 5, 8, 10];
    const result = await findAsync(array, checkIfEven);
    expect(result).toBe(8);
  });

  it('should return undefined if no elements match the async condition', async () => {
    const array = [1, 3, 5, 7, 9];
    const result = await findAsync(array, checkIfEven);
    expect(result).toBeUndefined();
  });

  it('should handle an empty array', async () => {
    const array: number[] = [];
    const result = await findAsync(array, checkIfEven);
    expect(result).toBeUndefined();
  });

  it('should handle array with one matching element', async () => {
    const array = [1, 2, 3, 4];
    const result = await findAsync(array, checkIfEven);
    expect(result).toBe(2);
  });

  it('should handle array with all matching elements', async () => {
    const array = [2, 4, 6, 8];
    const result = await findAsync(array, checkIfEven);
    expect(result).toBe(2);
  });

  it('should handle an array with one element', async () => {
    const array = [3];
    const result = await findAsync(array, checkIfEven);
    expect(result).toBeUndefined();
  });

  it('should handle async checks with different delays', async () => {
    const asyncCheckWithDelays = async (item: number) => {
      const delay = item * 50; // Varying delays based on the item value
      await new Promise((resolve) => setTimeout(resolve, delay));
      return item % 2 === 0;
    };
    const array = [1, 3, 4, 5, 10];
    const result = await findAsync(array, asyncCheckWithDelays);
    expect(result).toBe(4);
  });

  it('should handle async checks even if some fail', async () => {
    const checkIfEvenWithRejectOn3 = async (item: number, delay: number = 100) => {
      if (item === 3) throw Error('forbidden');
      await new Promise((resolve) => setTimeout(resolve, delay));
      return item % 2 === 0;
    };
    const array = [1, 3, 4, 5, 10];
    await expect(checkIfEvenWithRejectOn3(3)).rejects.toThrow(Error('forbidden'));
    const result = await findAsync(array, checkIfEvenWithRejectOn3);
    expect(result).toBe(4);
  });
});
