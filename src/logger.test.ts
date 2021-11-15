import logger from "./logger";

test("log hashmap", () => {
  logger.warn({ error: { msg: "Message" } }, "Example");
});

test("log trace", () => {
  logger.trace("Exampled");
});

test("log error", () => {
  logger.error({ error: new Error("ops") }, "Error");
});
