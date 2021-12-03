import createBot, { setup } from "./GameBot";
import logger, { switchToConsole } from "./logger";
import * as config from "./config";

switchToConsole();

const token = config.TELEGRAM_TOKEN;

const bot = createBot(token);
type botType = typeof bot;

async function dropWebhook(bot: botType) {
  const webhook = await bot.api.getWebhookInfo();
  if (webhook.url) {
    await bot.api.deleteWebhook();
  }
}
async function run() {
  await dropWebhook(bot);
  await setup(bot);
  logger.info("Starting a bot");
  bot.start();
}

process.on("unhandledRejection", (reason, promise) => {
  logger.error(
    {
      promise,
      reason,
    },
    "WTF? TO LATE Unhandled Rejection"
  );
});

run();
