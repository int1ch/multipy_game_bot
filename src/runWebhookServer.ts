//import fastify from "fastify";
import express from "express";
import { webhookCallback } from "grammy";
import createBot, { setupAndRunPoll } from "./GameBot";

const TOKEN =
  process.env.BOT_TOKEN || "127746074:AAGD5aDG02m2DndUZZMB_J6MyC5FEBoVNQ4";

const PORT = process.env.BOT_PORT || 8087;
const bot = createBot(TOKEN);

//const app = fastify({ logger: true });

// 'express' is also used as default if no argument is given
//app.register(webhookCallback(bot, "fastify"));
const app = express();
app.use(express.json());
app.use(webhookCallback(bot, "express"));

async function run() {
  try {
    console.log("Will Listening on " + PORT);
    await app.listen(PORT);
  } catch (err) {
    console.log("Error:", err);
    //app.log.error(err);
    process.exit(1);
  }
}
run();
