import { Context, SessionFlavor, session, Keyboard } from "grammy";
import { Router } from "@grammyjs/router";
import { generateSimpleGame } from "./SimpleMultipyGame";

import { ReplyKeyboardMarkup, ReplyKeyboardRemove } from "@grammyjs/types";
import { Question } from "./GamesCommon";
import { generateVariantGame } from "./VariantMultiplyGame";

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
  gameState?: {
    questionN: number;
    questions: Question[];
    score: number;
    try: 0;
    start: number;
  };
}

type GameContext = Context & SessionFlavor<SessionData>;

export const router = new Router<GameContext>((ctx) => ctx.session.gameType);
router.route(SIMPLE_GAME, async (ctx, next) => {
  const message = ctx.msg;
  if (!message) {
    return await next();
  }

  const text = message.text;
  console.log("Simple game get message:", text);
  if (text) {
    const shifter = new GameStateShifter(ctx);
    const response = shifter.checkAnswer(text);
    if (response) {
      return await botResponse(ctx, response);
    } else {
      await next();
    }
  } else {
    console.log("Unexpeted message:", ctx.msg);
  }
});

export async function startGame(ctx: GameContext) {
  await ctx.reply("Generating Game");
  const selectGame = 1; //Math.random();
  const game = selectGame > 0.5 ? generateSimpleGame() : generateVariantGame();

  const question = game.questions[0];
  if (!question) {
    console.log("Generation failed", game);
    return await botResponse(ctx, { text: "internal error" });
  }
  console.log("Ask first question", question);
  ctx.session.gameState = {
    questionN: 0,
    score: 0,
    try: 0,
    questions: game.questions,
    start: new Date().getTime(),
  };

  ctx.session.gameType = SIMPLE_GAME;
  return await botResponse(ctx, question);
}

async function botResponse(ctx: GameContext, response: ShifterTextResponse) {
  const text = response.text;
  let reply_markup: ReplyKeyboardMarkup | ReplyKeyboardRemove | undefined;
  if (response.variants) {
    const keyboard = new Keyboard();
    for (const variant of response.variants) {
      keyboard.text(variant);
    }
    reply_markup = {
      one_time_keyboard: true,
      keyboard: keyboard.build(),
    };
  } else {
    //reply_markup = {
    //  keyboard: generateKeyboard(),
    //};
  }
  if (response.endGame) {
    reply_markup = { remove_keyboard: true };

    ctx.session.gameState = undefined;
    ctx.session.gameType = undefined;
  }
  return await ctx.reply(text, {
    reply_markup,
  });
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
interface ShifterTextResponse {
  text: string;
  variants?: string[];
  endGame?: boolean;
  result?: any; //FIXME
}
class GameStateShifter {
  protected MAX_TRYS = 2;
  protected ctx: GameContext;
  constructor(ctx: GameContext) {
    this.ctx = ctx;
  }

  public checkAnswer(text: string): ShifterTextResponse {
    const gameState = this.ctx.session.gameState;
    if (!gameState) {
      console.log(
        "no game state: internal error",
        this.ctx.session,
        this.ctx.message
      );
      return { text: "internal error %(" };
    }
    const question = gameState.questions[gameState.questionN];
    if (text == question.answer) {
      gameState.score += question.score || 1;
      return this.nextQuestion();
    }
    return this.reQuestion();
  }
  public finishGame(): ShifterTextResponse {
    const endTime = new Date().getTime();
    const startTime = this.ctx.session.gameState?.start;
    let strTaken = "";
    let taken = 0;
    if (startTime) {
      let taken = endTime - startTime;
      strTaken = (taken / 1000).toFixed(1);
      strTaken = `\nВаш Результат ${strTaken} секунд`;
    }

    return {
      text: "Поздравляю игра закончена!" + strTaken,
      endGame: true,
      result: {
        ms: taken,
        score: this.ctx.session.gameState?.score,
      },
    };
  }
  public nextQuestion(): ShifterTextResponse {
    const gameState = this.ctx.session.gameState;
    if (!gameState) {
      return {
        text: "game stopped",
      };
    }
    const nextN = gameState.questionN + 1;
    if (nextN >= gameState.questions.length) {
      return this.finishGame();
    }
    const nextQuestion = gameState.questions[nextN];
    //alter state
    gameState.questionN = nextN;
    gameState.try = 0;
    return {
      text: nextQuestion.text,
      variants: nextQuestion.variants,
    };
  }
  public reQuestion(): ShifterTextResponse {
    const gameState = this.ctx.session.gameState;
    if (!gameState) {
      throw new Error("Game stopped");
    }
    const question = gameState.questions[gameState.questionN];
    const answer = question.answer;
    //try
    if (gameState.try > this.MAX_TRYS) {
      // FAIL
      const response = this.nextQuestion();
      response.text =
        `Снова не угадали, правильный ответ ${answer}\n` +
        "давайте слудующий вопрос\n" +
        response.text;

      return response;
    }
    // TRY AGAIN
    gameState.try++;
    return {
      text: `Нет, попоробуйте еще раз ${gameState.try}`,
    };
  }
}
