import {
  Game,
  GAME_SPEED,
  PlainGameState as InternalGameState,
  Question,
} from "./Game/Interfaces";
import { GameTextGenerator, TextResponse } from "./GameTextGenerator";
import { GameContext } from "./GameRouter";
import { GameStats } from "./db/GameStats";
import central from "./CentralStation";
import { ReplyKeyboardMarkup, ReplyKeyboardRemove } from "@grammyjs/types";
import { Keyboard } from "grammy";
import { GameState } from "./GameState";

export class GameProcessor {
  protected MAX_ATTEMPTS = 3;
  protected _gameStats: GameStats | undefined;

  constructor(
    protected gameState: GameState,
    protected playerId: number,
    injection?: { gameStats: GameStats }
  ) {
    this._gameStats = injection?.gameStats;
  }
  static newGame(game: Game, playerId: number) {
    const newState = GameState.newGame(game);
    const processor = new GameProcessor(newState, playerId);
    return processor;
  }
  //DIjection for tests?
  get gameStats(): GameStats {
    if (this._gameStats) {
      return this._gameStats;
    }
    return central.gameStats;
  }
  public stateRef() {
    return this.gameState.ref();
  }
  public async startGame(): Promise<GameResponse> {
    this.gameState.startGame();
    let response: GameResponse = await this.askQuestion();
    if (this.gameState.type === GAME_SPEED) {
      //FIXME
      response.startEndTimer = 30;
    }
    return response;
  }
  public async checkAnswer(text: string): Promise<GameResponse> {
    const question = this.gameState.getCurrentQuestion();
    //todo prepare text
    if (question.answer === text) {
      //save question stat here
      //save game stat sovewere in here

      this.gameState.increaseScore();

      return await this.moveToNextQuestionAndReturnStats({ scored: true });
    }
    this.gameState.addCurrentQuestionToFailed(question);
    return await this.reAskQuestion();
  }
  public async moveToNextQuestionAndReturnStats(options?: {
    previousQuestionFailed?: boolean;
    scored?: boolean;
  }): Promise<GameResponse> {
    const previousQuestionFailed = !!options?.previousQuestionFailed;

    const oldQuestion = this.gameState.getCurrentQuestion();
    const elapsedMs = this.gameState.questionElapsedTimeMs();
    const questionStat: QuestionStat = {
      text: oldQuestion.text,
      timeMs: elapsedMs,
      failed: previousQuestionFailed,
    };

    const response = await this.moveToNextQuestion(options);

    const result = {
      ...response,
      questionStat,
    };

    return result;
  }
  public async moveToNextQuestion(options?: {
    previousQuestionFailed?: boolean;
    scored?: boolean;
  }): Promise<GameResponse> {
    const previousQuestionFailed = !!options?.previousQuestionFailed;
    const questionScored = !!options?.scored;

    if (this.gameState.isLastQuestion()) {
      return await this.finishGame({ previousQuestionFailed });
    }

    const oldQuestion = this.gameState.getCurrentQuestion();
    this.gameState.stateNextQuestion();

    const nextQuestion = this.gameState.getCurrentQuestion();
    const textResponse = previousQuestionFailed
      ? GameTextGenerator.FailedThenNextQuestion(
          nextQuestion,
          oldQuestion.answer
        )
      : GameTextGenerator.AskQuestion(nextQuestion);

    return textResponse;
  }
  public async finishGame(options?: {
    previousQuestionFailed: boolean;
  }): Promise<GameResponse> {
    const previousQuestionFailed = options?.previousQuestionFailed;
    const timeTakenMs = this.gameState.gameElapsedTimeMs();
    const score = this.gameState.score;

    //const telegamId = this.getTelegramId();
    const statsFetcher = null;
    const textResponse = await GameTextGenerator.FinishGame({
      takenTimeMs: timeTakenMs,
      score: score,
      failedQuestions: this.gameState.failedQuestions,
      playerId: this.playerId,
      stats: this.gameStats,
    });

    return {
      ...textResponse,
      removeKeyboard: true,
      gameStat: {
        timeMs: timeTakenMs,
        score: score,
      },
      endGame: true,
    };
  }
  public async reAskQuestion() {
    const attempts = this.gameState.getCurrentQuestionAttempts();
    if (attempts >= this.MAX_ATTEMPTS) {
      return await this.moveToNextQuestionAndReturnStats({
        previousQuestionFailed: true,
      });
    }
    this.gameState.increaseQuestionAttempts();
    return this.askQuestion({ previousQuestionFailed: true });
  }
  public askQuestion(options?: { previousQuestionFailed: boolean }) {
    const previousQuestionFailed = options?.previousQuestionFailed;
    const question = this.gameState.getCurrentQuestion();
    const response: GameResponse = previousQuestionFailed
      ? GameTextGenerator.ReAskQuestion(
          question,
          this.gameState.getCurrentQuestionAttempts()
        )
      : GameTextGenerator.AskQuestion(question);

    response.addEndGameTimerText = true;
    return response;
  }
  public async setLastMessage() {
    throw new Error("not ready!");
  }
}
interface GameStat {
  timeMs: number;
  score: number;
}
interface QuestionStat {
  text: string;
  timeMs: number;
  failed?: boolean;
}
export interface GameResponse extends TextResponse {
  //text
  //variants
  removeKeyboard?: boolean;
  questionStat?: QuestionStat;
  gameStat?: GameStat;
  endGame?: boolean;
  startEndTimer?: number; //seconds
  addEndGameTimerText?: boolean;
}
