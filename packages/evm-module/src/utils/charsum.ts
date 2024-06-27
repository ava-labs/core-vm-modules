export function charsum(s: string): number {
  let i,
    sum = 0;
  for (i = 0; i < s.length; i++) {
    sum += s.charCodeAt(i) * (i + 1);
  }
  return sum;
}
