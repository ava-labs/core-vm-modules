import { charsum } from './charsum';

// from https://stackoverflow.com/a/25105589
export function arrayHash(array: string[]): string {
  let i,
    sum = 0;
  for (i = 0; i < array.length; i++) {
    const cs = charsum(array[i] ?? '');
    sum = sum + 65027 / cs;
  }
  return ('' + sum).slice(0, 16);
}
