import { generateVariants } from "./SimpleMultiplyGame";

test("generateVariants", () => {
  const answer = 6;
  const variants = generateVariants(6);
  expect(variants).toEqual(expect.arrayContaining([String(answer)]));

  expect(Array.isArray(variants)).toBe(true);
  expect(variants?.length).toBeGreaterThan(3);
  expect(variants?.includes(String(answer))).toBeTruthy();
});
