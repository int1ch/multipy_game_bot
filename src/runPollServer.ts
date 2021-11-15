import createBot, { setupAndRunPoll } from "./GameBot";
import logger from "./logger";

const token =
  process.env.BOT_TOKEN || "127746074:AAGD5aDG02m2DndUZZMB_J6MyC5FEBoVNQ4";

const bot = createBot(token);
setupAndRunPoll(bot);

process.on("unhandledRejection", (reason, promise) => {
  logger.error(
    {
      promise,
      reason,
    },
    "WTF? TO LATE Unhandled Rejection"
  );
});
