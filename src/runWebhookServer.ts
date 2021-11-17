//import fastify from "fastify";
import express from "express";
import { webhookCallback } from "grammy";
import createBot, { setup } from "./GameBot";
import * as config from "./config";

import logger from "./logger";

const TOKEN = config.TELEGRAM_TOKEN;

const PORT = config.BOT_PORT;
const TELEGRAM_WEBHOOK_URL = config.TELEGRAM_WEBHOOK_URL;
const bot = createBot(TOKEN);

type botType = typeof bot;

//const app = fastify({ logger: true });

// 'express' is also used as default if no argument is given
//app.register(webhookCallback(bot, "fastify"));
const app = express();
app.use(express.json());
app.use(webhookCallback(bot, "express"));

async function registerWebhook(bot: botType) {
  if (TELEGRAM_WEBHOOK_URL) {
    await bot.api.setWebhook(TELEGRAM_WEBHOOK_URL);
    logger.info(`Setted webhook to:${TELEGRAM_WEBHOOK_URL}`);
  } else {
    logger.warn("run bot without webhook");
  }
}

async function run() {
  try {
    await setup(bot);
    console.log("Will Listening on " + PORT);
    const listenPromise = app.listen(PORT);
    await registerWebhook(bot);
    await listenPromise;
  } catch (err) {
    console.log("Error:", err);
    //app.log.error(err);
    process.exit(1);
  }
}
run();
