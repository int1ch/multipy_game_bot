import { tgEscape } from "./GameTextGenerator";

it("ESCAPE", () => {
  expect(tgEscape("Hi!")).toBe("Hi\\!");
  expect(tgEscape("#Comment.")).toBe("\\#Comment\\.");
});

it("Double Escape", () => {
  expect(tgEscape("Hi!!")).toBe("Hi\\!\\!");
});

it("Full escape", () => {
  expect(tgEscape("_*[]()~`>#+-=|{}.!")).toBe(
    "_\\*\\[\\]\\(\\)\\~\\`>\\#\\+\\-=\\|\\{\\}\\.\\!"
  );
});
