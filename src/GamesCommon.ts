export function normalizedAB(a: number, b: number) {
  if (a > b) {
    return `${b}x${a}`;
  }
  return `${a}x${b}`;
}
