import process from "process";
import {
  Bot,
  GrammyError,
  HttpError,
  Context,
  session,
  SessionFlavor,
} from "grammy";

import logger from "./logger";

import centralStation from "./CentralStation";
import { GameRouterGenerator } from "./GameRouter";
import central from "./CentralStation";

interface SessionData {
  gameType?: string;
  gameTime?: number;
  gameState?: any;
}

Error.stackTraceLimit = 10;

type GameContext = Context & SessionFlavor<SessionData>;

// Create a bot object

export function createBot(token: string) {
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
  //FIXME!!!
  const routerGen = new GameRouterGenerator(bot.api, { central });
  bot.use(routerGen);

  bot.command("start", (ctx) => {
    ctx.reply(
      "привет, это ботик для испытания того как вы знаете таблицу умножения, /game для старта испытания"
    );
  });
  bot.command("help", (ctx) => {
    logger.debug("GET HELP");
    ctx.reply("/game для старта испытания!, /top для вывода рейтинга");
  });
  bot.command("a", (ctx) => {
    ctx.reply("Prepare help");
  });

  /*
  bot.command("game", async (ctx) => {
    try {
      await routerGen.startGame(ctx);
    } catch (e) {
      logger.error({ error: e }, "ERROR in /game command");
    }
  });
  */

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
    logger.info("TOP text: " + text);
    ctx.reply(text, { parse_mode: "MarkdownV2" });
  });

  bot.on("message:text", (ctx) => ctx.reply("Echo2: " + ctx.message.text));

  bot.catch((err) => {
    const ctx = err.ctx;
    logger.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      logger.error({ error: e }, "Error in request:" + e.description);
    } else if (e instanceof HttpError) {
      logger.error({ error: e }, "Could not contact Telegram:", e);
    } else {
      logger.error({ error: e }, "Unknown error:");
    }
  });
  return bot;
}

export async function setup(bot: Bot<GameContext>) {
  await bot.api.setMyCommands([
    { command: "help", description: "Показать помошь" },
    { command: "game", description: "Запустить игру" },
    { command: "skip", description: "Пропустить вопрос" },
  ]);
}

export default createBot;
