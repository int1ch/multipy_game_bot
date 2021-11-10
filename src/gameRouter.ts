import { Context, SessionFlavor, session, Keyboard } from "grammy";
import { Router } from "@grammyjs/router";
import { generateSimpleGame } from "./SimpleMultiplyGame";

import {
  ParseMode,
  ReplyKeyboardMarkup,
  ReplyKeyboardRemove,
} from "@grammyjs/types";

import { generateVariantGame } from "./VariantMultiplyGame";
import {
  GameStat,
  PlainGameState,
  GameStateShifter,
  QuestionStat,
  ShifterResponse,
} from "./GameStateShifter";

import { GameStats } from "./db/GameStats";
import knex from "./knexConnection";
import { GameTextGenerator } from "./GameTextGenerator";
import { stringify } from "querystring";
import { GameProcessor, GameResponse } from "./GameProcessor";
import { GameState } from "./GameState";

export const SIMPLE_GAME = "simple";

/*
this keyBoard Not working
const numKeyboard = new Keyboard()
  .text("1")
  .text("2")
  .text("3")
  .text("4")
  .text("5")
  .row()
  .text("6")
  .text("7")
  .text("8")
  .text("9")
  .text("0");
*/

interface SessionData {
  gameType?: string;
  gameTime?: number;
  gameState?: PlainGameState;
}

export type GameContext = Context & SessionFlavor<SessionData>;

export const router = new Router<GameContext>((ctx) => ctx.session.gameType);
const pgStats = new GameStats({ knex });

router.route(SIMPLE_GAME, async (ctx, next) => {
  try {
    const message = ctx.msg;
    if (!message) {
      return await next();
    }

    const player = await getOrCreatePlayerByCtx(ctx, pgStats);
    const playerId = player.playerId;

    const text = message.text;
    console.log("Simple game get message:", text);
    const gameState = ctx.session.gameState;
    if (gameState && text) {
      const state = new GameState(gameState);
      const game = new GameProcessor(state, playerId);
      const response = await game.checkAnswer(text);
      console.log("GET RESPONSE", response);
      if (response) {
        return await processGameResponse(ctx, response, playerId);
      } else {
        await next();
      }
    } else {
      console.log("Unexpected message:", ctx.msg);
    }
  } catch (e) {
    console.error("I2", e);
  }
});

async function getOrCreatePlayerByCtx(ctx: Context, stats: GameStats) {
  const from = ctx.message?.from;
  if (!from) {
    throw new Error("Context with message.from expected");
  }
  const telegramId = from.id;
  let player = await pgStats.getPlayerByTelegramId(telegramId);
  if (!player) {
    const login = from.username;
    const name = from.first_name;
    player = await pgStats.savePlayer(telegramId, name, login);
  }
  return player;
}

export async function startGame(ctx: GameContext) {
  await ctx.reply("Generating Game");
  const selectGame = 1; //Math.random();
  const game = selectGame > 0.5 ? generateSimpleGame() : generateVariantGame();
  const player = await getOrCreatePlayerByCtx(ctx, pgStats);

  const processor = GameProcessor.newGame(game, player.playerId);
  //new GameProcessor(ctx.session.gameState!, player.playerId);
  const response = await processor.startGame();

  ctx.session.gameType = SIMPLE_GAME;
  ctx.session.gameState = processor.stateRef();

  return await processGameResponse(ctx, response, player.playerId);
}

async function processGameResponse(
  ctx: GameContext,
  response: GameResponse,
  playerId: number
) {
  if (response.text) {
    await telegramReply(ctx, response);
  }

  if (response.endGame) {
    ctx.session.gameState = undefined;
    ctx.session.gameType = undefined;
  }
  const gameType = "FIXME";
  const gStat = response.gameStat;
  if (gStat) {
    await pgStats.saveGameResult(playerId, gameType, gStat.timeMs, gStat.score);
  }

  const qStat = response.questionStat;
  if (qStat) {
    try {
      await pgStats.saveGameQuestionResult(
        playerId,
        qStat.text,
        qStat.timeMs
        //qStat.failed,
      );
    } catch (e: any) {
      console.log("L2 EXPECT PROBLEMS HERE", e);
    }
  }
}
//output
async function telegramReply(ctx: GameContext, response: GameResponse) {
  //const ctx = this.ctx;
  const text = response.text;
  let reply_markup: ReplyKeyboardMarkup | ReplyKeyboardRemove | undefined;
  let parse_mode: ParseMode | undefined;
  if (response.variants) {
    reply_markup = {
      one_time_keyboard: true,
      keyboard: telegramReplyKeyboard(response.variants),
    };
  }
  if (response.parse_mode) {
    parse_mode = response.parse_mode;
  }
  if (response.removeKeyboard) {
    reply_markup = { remove_keyboard: true };
  }
  return await ctx.reply(text, {
    reply_markup,
    parse_mode,
  });
}
function telegramReplyKeyboard(variants: string[]) {
  const keyboard = new Keyboard();
  for (const variant of variants) {
    keyboard.text(variant);
  }
  return keyboard.build();
}
/*
  
  gameState: {
    questionN: number;
    questions: Question[];
    score: number;
  };
  и мы по нему как то движемся
  движение создает - реакции

  с точки зрения отвественности:
    движение - ничего не должно знать про CTX
  но как рализовать отправку через timeout?  

*/
