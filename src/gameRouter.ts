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

interface GameState {
  questionN: number;
  questions: Question[];
  score: number;
  try: 0;
  startTs: number;
  startQuestionTs: number;
}
interface SessionData {
  gameType?: string;
  gameTime?: number;
  gameState?: GameState;
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
  const gameState = ctx.session.gameState;
  if (gameState && text) {
    const shifter = new GameStateShifter(gameState);
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

  const shifter = GameStateShifter.newGame(game);
  const question = shifter.startGame();

  if (!question) {
    console.log("Generation failed", game);
    return await botResponse(ctx, { text: "internal error" });
  }
  console.log("Ask first question", question);

  ctx.session.gameState = shifter.getState();
  ctx.session.gameType = SIMPLE_GAME;
  return await botResponse(ctx, question);
}

async function botResponse(ctx: GameContext, response: ShifterResponse) {
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
interface QuestionStat {
  text: string;
  timeMs: number;
}
interface GameStat {
  timeMs: number;
  score: number;
}
interface ShifterResponse {
  text: string;
  variants?: string[];
  endGame?: boolean;
  result?: any; //FIXME
  stats?: {
    question?: QuestionStat;
    game?: GameStat;
  };
}
interface Game {
  questions: Question[];
}
class GameStateShifter {
  protected MAX_TRYS = 2;
  protected state: GameState;
  constructor(ctx: GameState) {
    this.state = ctx;
  }
  public getState() {
    return this.state;
  }

  static newGame(game: Game) {
    const state: GameState = {
      questions: game.questions,
      questionN: -1,
      score: 0,
      try: 0,
      startTs: new Date().getTime(),
      startQuestionTs: 0,
    };
    return new GameStateShifter(state);
  }
  public checkAnswer(text: string): ShifterResponse {
    const gameState = this.state;
    const question = gameState.questions[gameState.questionN];
    if (text == question.answer) {
      gameState.score += question.score || 1;
      return this.nextQuestion();
    }
    return this.reQuestion();
  }
  public finishGame(): ShifterResponse {
    const endTime = new Date().getTime();
    const gameState = this.state;
    const startTime = gameState.startTs;
    let strTaken = "";
    let taken = 0;
    if (startTime) {
      taken = endTime - startTime;
      strTaken = (taken / 1000).toFixed(1);
      strTaken = `\nВаш Результат ${strTaken} секунд`;
    }

    return {
      text: "Поздравляю игра закончена!" + strTaken,
      endGame: true,
      result: {
        ms: taken,
        score: gameState.score,
      },
      stats: {
        game: {
          timeMs: taken,
          score: gameState.score,
        },
      },
    };
  }
  public startGame(): ShifterResponse {
    const gameState = this.state;
    gameState.questionN = -1;
    return this.nextQuestion();
  }
  public askQuestion(): ShifterResponse {
    const gameState = this.state;
    const nextQuestion = gameState.questions[gameState.questionN];
    //alter state
    return {
      text: nextQuestion.text,
      variants: nextQuestion.variants,
    };
  }
  static addQuestionStat(
    response: ShifterResponse,
    stats: undefined | QuestionStat
  ) {
    if (stats) {
      response.stats ||= {};
      response.stats!.question = stats;
    }
    return response;
  }
  public nextQuestion(): ShifterResponse {
    const gameState = this.state;
    const thisN = gameState.questionN;
    const nextN = gameState.questionN + 1;
    let stats: QuestionStat | undefined;
    if (thisN >= 0) {
      const elapsed = new Date().getTime() - gameState.startQuestionTs;
      stats = {
        text: gameState.questions[gameState.questionN].text,
        timeMs: elapsed,
      };
    }

    if (nextN >= gameState.questions.length) {
      return GameStateShifter.addQuestionStat(this.finishGame(), stats);
    }
    gameState.questionN = nextN;
    gameState.try = 0;
    gameState.startQuestionTs = new Date().getTime();

    return GameStateShifter.addQuestionStat(this.askQuestion(), stats);
  }
  public reQuestion(): ShifterResponse {
    const gameState = this.state;
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
