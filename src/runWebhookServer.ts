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

const random = Math.floor(Math.random() * 16 ** 8).toString(16);
const webhook_url = TELEGRAM_WEBHOOK_URL + "/" + random;

//const app = fastify({ logger: true });

// 'express' is also used as default if no argument is given
//app.register(webhookCallback(bot, "fastify"));
const app = express();
app.use(express.json());
app.use(function (req, res, next) {
  logger.info(`> ${req.path}`);
  next();
});
const botExpressCallback = webhookCallback(bot, "express");
app.use("/" + random, function (request, response) {
  botExpressCallback(request, response).catch((error) => {
    logger.error(error, "webhook errror");
  });
});

async function registerWebhook(bot: botType) {
  if (TELEGRAM_WEBHOOK_URL) {
    await bot.api.setWebhook(webhook_url);
    logger.info(`Setted webhook to:${webhook_url}`);
  } else {
    logger.warn("run bot without webhook");
  }
}

async function run() {
  try {
    await setup(bot);
    logger.debug("Will Listening on " + PORT);
    const listenPromise = app.listen(PORT);
    await registerWebhook(bot);
    await listenPromise;
  } catch (err) {
    logger.error(err, "Error in main Loop");
    //app.log.error(err);
    process.exit(1);
  }
}
run();
