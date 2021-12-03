import {
  Api,
  Bot,
  Context,
  MiddlewareFn,
  MiddlewareObj,
  NextFunction,
  RawApi,
  SessionFlavor,
} from "grammy";
import { Router } from "@grammyjs/router";
import { generateSimpleGame } from "./SimpleMultiplyGame";

import { generateSpeedGame, generateVariantGame } from "./VariantMultiplyGame";
import {
  GameStat,
  GameType,
  GAME_SIMPLE,
  GAME_SPEED,
  PlainGameState,
} from "./Game/Interfaces";

import { GameStats } from "./db/GameStats";
import knex from "./knexConnection";

import { GameProcessor, GameResponse } from "./GameProcessor";
import { GameState } from "./GameState";

import logger from "./logger";
import { telegramReply, telegramSendMessage } from "./telegramReply";
import { EndGameTimer, GameTimerStorage } from "./GameTimer";
import { GameStateStorage } from "./GameStateStorage";
import { GameTextGenerator } from "./GameTextGenerator";
import { Knex } from "knex";
import central, { CentralStation } from "./CentralStation";
import { createSecureContext } from "tls";
import { chatIdType, CommonGame } from "./Game/CommonGame";
import { SpeedGame } from "./Game/SpeedGame";

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

type Awaited<T> = T extends PromiseLike<infer R> ? R : T;

export type GameContext = Context & SessionFlavor<SessionData>;

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
interface GameRouterOptions {
  knex?: Knex;
  central?: CentralStation;
  gameStats?: GameStats;
  gameStorage?: GameStateStorage<PlainGameState>;
  gameTimers?: GameTimerStorage;
}

function gameClass() {
  return SpeedGame;
}

export class GameRouterGenerator implements MiddlewareObj {
  protected pgStats: GameStats;
  protected gameStorage: GameStateStorage<PlainGameState>;
  protected gameTimers: GameTimerStorage;
  constructor(protected botapi: Api<RawApi>, options?: GameRouterOptions) {
    const objKnex: Knex =
      options?.knex ?? options?.central?.knex ?? central.knex;
    this.pgStats = options?.gameStats ?? new GameStats({ knex: objKnex });
    this.gameStorage = options?.gameStorage ?? new GameStateStorage();
    this.gameTimers = options?.gameTimers ?? new GameTimerStorage();
  }

  public async getOrCreatePlayerByCtx(ctx: Context, stats: GameStats) {
    const from = ctx.message?.from;
    if (!from) {
      throw new Error("Context with message.from expected");
    }
    const telegramId = from.id;
    let player = await this.pgStats.getPlayerByTelegramId(telegramId);
    if (!player) {
      const login = from.username;
      const name = from.first_name;
      player = await this.pgStats.savePlayer(telegramId, name, login);
    }
    return player;
  }

  public chatId(ctx: Context) {
    const id = ctx.chat?.id;
    if (id) {
      return String(id);
    }
    return undefined;
  }

  protected async startGameOld(ctx: Context, chatId: chatIdType) {
    await ctx.reply("Generating Game");

    const selectGame = 1; //Math.random();

    const player = await this.getOrCreatePlayerByCtx(ctx, this.pgStats);
    const createClass = gameClass();
    const game = new createClass({
      botapi: this.botapi,
      chatId,
      playerId: player.playerId,
      stateStorage: this.gameStorage,
      gameStats: this.pgStats,
      gameTimers: this.gameTimers,
    });
    await game.startGame();
    /*

    //const game = generateSpeedGame();
    //  selectGame > 0.5 ? generateSimpleGame() : generateVariantGame();
    
    const processor = GameProcessor.newGame(game, player.playerId);

    //new GameProcessor(ctx.session.gameState!, player.playerId);
    const response = await processor.startGame();

    ctx.session.gameType = game.type;

    const newState = processor.stateRef();
    this.gameStorage.write(chatId, newState);
    //ctx.session.gameState = newState //TODO REMOVE

    if (response.startEndTimer) {
      const timer = new EndGameTimer(bot.api, chatId, {
        seconds: 10, //FIXME
        endCallBack: async () => {
          const state = await this.gameStorage.read(chatId);
          if (!state) {
            throw new Error(`state not loaded by ${chatId}`);
          }
          const response = await GameTextGenerator.FinishSpeedGame(
            state.score,
            state.failedQuestions,
            player.playerId,
            this.pgStats
          );
          await this.processGameResponse(ctx, response, player.playerId);
        },
      });
      this.gameTimers.write(chatId, timer);
      timer.sendCountdownMessage();
    }

    return await this.processGameResponse(ctx, response, player.playerId);
    */
  }

  public async saveGameStatistics(
    gameStatistics: GameStat,
    playerId: number,
    gameType: string
  ) {
    if (gameType) {
      await this.pgStats.saveGameResult(
        playerId,
        gameType,
        gameStatistics.timeMs,
        gameStatistics.score
      );
    }
  }
  public async processGameResponse(
    ctx: GameContext,
    response: GameResponse,
    playerId: number
  ) {
    const gameType = ctx.session.gameType;
    const gameStatistics = response.gameStat;
    const chatId = ctx.chat?.id;

    if (gameStatistics && gameType) {
      this.saveGameStatistics(gameStatistics, playerId, gameType);
    }

    const questionStatics = response.questionStat;
    if (questionStatics) {
      try {
        await this.pgStats.saveGameQuestionResult(
          playerId,
          questionStatics.text,
          questionStatics.timeMs
          //qStat.failed,
        );
      } catch (e: any) {
        logger.warn({ error: e }, "L2 INTERCEPTOR EXPECT PROBLEMS HERE");
      }
    }

    if (response.endGame) {
      //ctx.session.gameState = undefined;
      // выключаем признак для роутера
      ctx.session.gameType = undefined;
    }

    //timer can be extracted from db
    //but is tiking only one,
    // all other used to envelope text
    //
    //const endGameTimer = await this.gameTimers.get(chatId);

    let telegramReplyResponse:
      | Awaited<ReturnType<typeof telegramReply>>
      | undefined;
    if (response.text) {
      telegramReplyResponse = await telegramSendMessage(
        this.botapi,
        chatId!,
        response
      );
    }
    return {
      telegramMessage: telegramReplyResponse,
    };
  }
  protected routerCheckAnswerFunction2() {
    return async (api: Api, ctx: GameContext, next: NextFunction) => {
      const message = ctx.msg;
      if (!message) {
        return await next();
      }
      const chatId = this.chatId(ctx);
      if (!chatId) {
        logger.warn(
          { chat: ctx.chat, from: ctx.from },
          "cant work without chat id"
        );
        return await next();
      }
      try {
        const player = await this.getOrCreatePlayerByCtx(ctx, this.pgStats);
        const playerId = player.playerId;

        //решить что это будет за игра
        const text = message.text;
        const gameState = await this.gameStorage.read(chatId);

        logger.info("Simple game get message: %s", text);

        //const gameState = ctx.session.gameState;
        if (gameState && text) {
          //TODO game selection
          const createClass = gameClass();
          const game = new createClass({
            botapi: this.botapi,
            chatId,
            playerId: player.playerId,
            stateStorage: this.gameStorage,
            gameStats: this.pgStats,
            gameTimers: this.gameTimers,
          });
          return await game.checkAnswer(text, gameState);

          /*
          old way
          const stateShifter = new GameState(gameState);
          const game = new GameProcessor(stateShifter, playerId);
          const response = await game.checkAnswer(text);

          if (response) {
            const r = await this.processGameResponse(ctx, response, playerId);
            await this.gameStorage.write(chatId, stateShifter.ref());
            return r;
          }
          */

          return await next();
        }

        logger.warn("Unexpected message: %s", ctx.msg);
      } catch (e) {
        logger.error({ error: e }, "Check answer error");
      }
    };
  }
  protected routerCheckAnswerFunction() {
    return async (ctx: GameContext, next: NextFunction) => {
      const message = ctx.msg;
      if (!message) {
        return await next();
      }
      const chatId = this.chatId(ctx);
      if (!chatId) {
        logger.warn({ chat: ctx.chat }, "cant work without chat id");
        return await next();
      }

      try {
        const player = await this.getOrCreatePlayerByCtx(ctx, this.pgStats);
        const playerId = player.playerId;

        const text = message.text;
        logger.info("Simple game get message: %s", text);
        const gameState = await this.gameStorage.read(chatId);
        //const gameState = ctx.session.gameState;
        if (chatId && gameState && text) {
          const stateShifter = new GameState(gameState);
          const game = new GameProcessor(stateShifter, playerId);
          const response = await game.checkAnswer(text);

          if (response) {
            const r = await this.processGameResponse(ctx, response, playerId);
            await this.gameStorage.write(chatId, stateShifter.ref());
            return r;
          }

          return await next();
        }

        logger.warn("Unexpected message: %s", ctx.msg);
      } catch (e) {
        logger.error({ error: e }, "Check answer error");
      }
    };
  }

  protected async startGame(ctx: Context, chatId: chatIdType) {
    await ctx.reply("Generating Game in new way");

    const selectGame = 1; //Math.random();

    const player = await this.getOrCreatePlayerByCtx(ctx, this.pgStats);
    const createClass = gameClass();
    const game = new createClass({
      botapi: this.botapi,
      chatId,
      playerId: player.playerId,
      stateStorage: this.gameStorage,
      gameStats: this.pgStats,
      gameTimers: this.gameTimers,
    });
    await game.startGame();
  }
  protected async playGame(
    ctx: Context,
    chatId: chatIdType,
    text: string,
    gameState: PlainGameState
  ) {
    try {
      const player = await this.getOrCreatePlayerByCtx(ctx, this.pgStats);
      const playerId = player.playerId;
      logger.info("Simple game get message: %s", text);

      //TODO game selection
      const createClass = gameClass();
      const game = new createClass({
        botapi: this.botapi,
        chatId,
        playerId: player.playerId,
        stateStorage: this.gameStorage,
        gameStats: this.pgStats,
        gameTimers: this.gameTimers,
      });

      return await game.checkAnswer(text, gameState);
    } catch (e) {
      logger.error({ error: e }, "Play Game Error");
      ctx.reply("error encountered :( game is broken");
    }
  }
  public middleware(): MiddlewareFn {
    return async (ctx, next) => {
      const message = ctx.msg;
      if (!message) {
        return await next();
      }
      const chatId = this.chatId(ctx);
      if (!chatId) {
        logger.warn({ chat: ctx.chat }, "cant work without chat id");
        return await next();
      }
      const text = message.text;
      logger.debug(`middle int: ${text}`);
      if (!text) {
        return await next();
      }
      //перехватчик можно разместить снаружи? они там мощнее
      if (text.includes("/game")) {
        return this.startGame(ctx, chatId);
      }
      const gameState = await this.gameStorage.read(chatId);
      if (gameState?.gameType) {
        return this.playGame(ctx, chatId, text, gameState);
      }
      //let others work
      return await next();
    };
  }
}

//const pgStats = new GameStats({ knex });
//const gameStorage = new GameStateStorage<PlainGameState>();
//const gameTimers = new GameTimerStorage<GameContext>();

//const generator = new GameRouterGenerator({ central });
//export default generator;
