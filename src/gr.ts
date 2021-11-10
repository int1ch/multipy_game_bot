import process from "process";
import {
  Bot,
  GrammyError,
  HttpError,
  Context,
  session,
  SessionFlavor,
} from "grammy";

import centralStation from "./CentralStation";
import { router as gameRouter, startGame } from "./gameRouter";

interface SessionData {
  gameType?: string;
  gameTime?: number;
  gameState?: any;
}

Error.stackTraceLimit = 20;

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
  ctx.reply(
    "привет, это ботик для испытания того как вы знаете таблицу умножения, /game для старта испытания"
  );
});
bot.command("help", (ctx) => {
  console.log("GET HELP");
  ctx.reply("/game для старта испытания!, /top для вывода рейтинга");
});
bot.command("a", (ctx) => {
  ctx.reply("Prepare help");
});

bot.command("game", async (ctx) => {
  try {
    await startGame(ctx);
  } catch (e) {
    console.error("ERROR in /game command", e);
  }
});

bot.command("top", async (ctx) => {
  //и что тут выводить?
  const gameStats = centralStation.gameStats;
  const top = await gameStats.getGameRating();
  if (!top || top.length === 0) {
    return await ctx.reply("Что то еще никто не играл, вы будете первым!");
  }
  const players_ids = top.map((el) => el.playerId);
  const playersInfo = await gameStats.getPayersInfo(players_ids);

  //const rLines : string[] = [];
  const rLines = top.map((t, i) => {
    const pos = i + 1;
    const info = playersInfo[t.playerId];
    const name = info && info.name ? info.name : "---";
    const score = t.score;
    const time = Number(t.minTimeMs / 1000).toFixed(1);
    //const errors = t.score;
    return `${pos}. ${name} --- Очки: ${score}, Время: ${time}`;
  });

  let text = "Рейтинг:\n ```\n" + rLines.join("\n") + "\n```";
  console.log("TOP text: ", text);
  ctx.reply(text, { parse_mode: "MarkdownV2" });
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
    { command: "help", description: "Показать помошь" },
    { command: "game", description: "Запустить игру" },
    { command: "skip", description: "Пропустить вопрос" },
  ]);

  console.info("Starting a bot");
  bot.start();
}
run();

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "WTF? TO LATE Unhandled Rejection at:",
    promise,
    "reason:",
    reason
  );
});
