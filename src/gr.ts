import {
  Bot,
  GrammyError,
  HttpError,
  Context,
  session,
  SessionFlavor,
} from "grammy";
import { router as gameRouter, startGame } from "./gameRouter";

interface SessionData {
  gameType?: string;
  gameTime?: number;
  gameState?: any;
}

type GameContext = Context & SessionFlavor<SessionData>;

// Create a bot object

const token =
  process.env.BOT_TOKEN || "127746074:AAGD5aDG02m2DndUZZMB_J6MyC5FEBoVNQ4";
const bot = new Bot<GameContext>(token);

// Register listeners to handle messages
bot.use(
  session({
    initial(): SessionData {
      return {
        gameType: undefined,
      };
    },
  })
);
bot.use(gameRouter);

bot.command("start", (ctx) => {
  ctx.reply("Welcome to math chanlenge");
});
bot.command("help", (ctx) => {
  console.log("GET HELP");
  ctx.reply("Prepare help");
});
bot.command("a", (ctx) => {
  ctx.reply("Prepare help");
});

bot.command("game", async (ctx) => {
  await startGame(ctx);
});

bot.on("message:text", (ctx) => ctx.reply("Echo2: " + ctx.message.text));

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});
// Start the bot (using long polling)

async function run() {
  await bot.api.setMyCommands([
    { command: "start", description: "Starts the bot" },
    { command: "help", description: "Show help text" },
    { command: "game", description: "Play game" },
  ]);
  bot.start();
}
run();
