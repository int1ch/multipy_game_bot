export function delay(delayMs: number, value?: any) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(value);
    }, delayMs);
  });
}
