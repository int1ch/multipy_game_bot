import { GameTextGenerator } from "./GameTextGenerator";

export interface Question {
  text: string;
  answer: string;
  variants?: string[];
  wrongTimeout?: number;
  score?: number;
}
export interface Game {
  questions: Question[];
}

export interface PlainGameState {
  questionN: number;
  questions: Question[];
  failedQuestions: Record<string, string>;
  score: number;
  try: 0;
  startTs: number;
  startQuestionTs: number;
}

export interface QuestionStat {
  text: string;
  timeMs: number;
}
export interface GameStat {
  timeMs: number;
  score: number;
}
export interface ShifterResponse {
  text: string;
  variants?: string[];
  endGame?: boolean;
  result?: any; //FIXME
  stats?: {
    question?: QuestionStat;
    game?: GameStat;
  };
}
export interface Game {
  questions: Question[];
}

const GTG = GameTextGenerator;

export class GameStateShifter {
  protected MAX_TRYS = 2;
  protected state: PlainGameState;
  constructor(ctx: PlainGameState) {
    this.state = ctx;
  }
  public getState() {
    return this.state;
  }

  static newGame(game: Game) {
    const state: PlainGameState = {
      questions: game.questions,
      questionN: -1,
      failedQuestions: {},
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
    let failedQuestionsArray: string[] = [];
    for (let [question, answer] of Object.entries(gameState.failedQuestions)) {
      failedQuestionsArray.push(question + " " + answer);
    }
    const failedQuestions = failedQuestionsArray.length
      ? "\n" + failedQuestionsArray.join("\n")
      : "";

    return {
      text: "Поздравляю игра закончена!" + strTaken + failedQuestions,
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
    return GTG.AskQuestion(nextQuestion);
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

    gameState.failedQuestions[question.text] = answer;
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
    return GTG.ReAskQuestion(question, gameState.try);
  }
}
