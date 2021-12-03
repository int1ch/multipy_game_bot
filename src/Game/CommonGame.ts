import { Api, RawApi } from "grammy";
import { GameStats } from "../db/GameStats";

import { GameState } from "../GameState";

import { GameStateStorage } from "../GameStateStorage";
import { GameTextGenerator, TextResponse } from "../GameTextGenerator";
import { telegramSendMessage } from "../telegramReply";
import { generateVariantGame } from "../VariantMultiplyGame";
import { CommonStateGame } from "./CommonStateGame";
import {
  GameType,
  GAME_SIMPLE,
  PlainGameState,
  Question,
  QuestionStat,
} from "./Interfaces";

export type chatIdType = string | number;
export type apiType = Api;

export class PlayerStatsSaver {
  constructor(
    protected statsSaver: GameStats,
    protected playerId: number,
    protected gameType: string
  ) {}
  public async saveQuestionStat(
    text: string,
    elapsedMs: number,
    failed?: boolean
  ) {
    if (failed) {
      return;
    }
    await this.statsSaver.saveGameQuestionResult(
      this.playerId,
      text,
      elapsedMs
    );
  }
  public async saveGameStat(score: number, elapsedMs: number) {
    await this.statsSaver.saveGameResult(
      this.playerId,
      this.gameType,
      elapsedMs,
      score
    );
  }
}
export interface PreviousQuestion {
  same?: boolean;
  failed?: boolean;
  attempts: number;
  answer?: string;
}
export interface QuestionResponse {
  previous?: PreviousQuestion;
  question: Question;
}
export interface EndGameResponse {
  previous?: PreviousQuestion;
  endGame: true;
  timeTakenMs: number;
  score: number;
}
export type NextStateResponse = QuestionResponse | EndGameResponse;
export interface CommonGameOptions {
  botapi: apiType;
  chatId: chatIdType;
  stateStorage: GameStateStorage<PlainGameState>;
  playerId: number;
  gameStats: GameStats;
}
export class CommonGame {
  protected MAX_ATTEMPTS = 3;
  protected gameType: GameType = GAME_SIMPLE;
  protected botapi: Api<RawApi>;
  protected chatId: chatIdType;
  protected stateStorage: GameStateStorage<PlainGameState>;
  protected playerId: number;
  protected gameStats: GameStats;
  constructor(
    options: CommonGameOptions
    //PROXY
  ) {
    this.botapi = options.botapi;
    this.chatId = options.chatId;
    this.stateStorage = options.stateStorage;
    this.playerId = options.playerId;
    this.gameStats = options.gameStats;
  }
  protected getPlayerStatsSaver() {
    return new PlayerStatsSaver(this.gameStats, this.playerId, this.gameType);
  }
  protected async prepareNewGame() {
    const game = this.generateQuestions();
    const stateShifter = GameState.newGame(game);
    return stateShifter;
  }
  protected async getState() {
    const stateStorage = this.stateStorage;
    const state = await stateStorage.read(this.chatId);
    if (!state) {
      throw new Error(`State not found on:${this.chatId}`);
    }
    const stateShifter = new GameState(state);
    return stateShifter;
  }
  protected async getStateOrDefault(state?: PlainGameState) {
    if (state) {
      return new GameState(state);
    }
    return await this.getState();
  }
  protected async writeState(stateShifter: GameState) {
    const stateStorage = this.stateStorage;
    await stateStorage.write(this.chatId, stateShifter.ref());
  }
  protected async deleteState() {
    const stateStorage = this.stateStorage;
    await stateStorage.delete(this.chatId);
  }
  protected game(stateShifter: any): CommonStateGame {
    const game = new CommonStateGame(
      stateShifter,
      this.MAX_ATTEMPTS,
      this.getPlayerStatsSaver()
    );
    return game;
  }
  public async startGame() {
    const stateShifter = await this.prepareNewGame();
    const game = this.game(stateShifter);
    const response = await game.startGame();
    //send messages
    await this.processGameResponse(response, stateShifter);
    await this.writeState(stateShifter);
  }
  // external finish of the game
  public async finishGame(state?: PlainGameState) {
    const stateShifter = await this.getStateOrDefault(state);
    const game = this.game(stateShifter);
    const response = await game.finishGame();
    //send messages
    await this.processGameResponse(response, stateShifter);
    await this.deleteState();
  }
  /*
    check answer and ask next one or finish game 
  */
  public async checkAnswer(text: string, state?: PlainGameState) {
    const stateShifter = await this.getStateOrDefault(state);
    const game = this.game(stateShifter);
    const response = await game.checkAnswer(text);
    //send message
    await this.processGameResponse(response, stateShifter);
    if (isEndGameResponse(response)) {
      await this.deleteState();
    } else {
      await this.writeState(stateShifter);
    }
  }

  public generateQuestions() {
    return generateVariantGame();
  }

  public async processQuestionResponse(
    response: QuestionResponse,
    state: GameState
  ) {
    const question = response.question;
    if (response.previous?.same) {
      return GameTextGenerator.ReAskQuestion(
        question,
        response.previous?.attempts
      );
    }
    if (response.previous?.failed) {
      //FIXME
      return GameTextGenerator.FailedThenNextQuestion(
        question,
        response.previous?.answer
      );
    }
    return GameTextGenerator.AskQuestion(question);
  }
  public async processEndGameResponse(r: EndGameResponse, state: GameState) {
    if (r.previous?.failed) {
      return GameTextGenerator.FailedThenFinishGame({
        takenTimeMs: r.timeTakenMs,
        score: r.score,
        failedQuestions: state.failedQuestions,
        playerId: this.playerId,
        stats: this.gameStats,
      });
    }
    const textResponse = await GameTextGenerator.FinishGame({
      takenTimeMs: r.timeTakenMs,
      score: r.score,
      failedQuestions: state.failedQuestions,
      playerId: this.playerId,
      stats: this.gameStats,
    });
    return textResponse;
  }
  public async processGameResponse(
    response: EndGameResponse | QuestionResponse,
    state: GameState
  ) {
    let textResponse: TextResponse;
    if (isQuestionResponse(response)) {
      textResponse = await this.processQuestionResponse(response, state);
    } else {
      textResponse = await this.processEndGameResponse(response, state);
    }

    if (textResponse.text) {
      await telegramSendMessage(this.botapi, this.chatId, textResponse);
    }
  }
}

function isQuestionResponse(r: NextStateResponse): r is QuestionResponse {
  return (r as any).question;
}
function isEndGameResponse(r: NextStateResponse): r is EndGameResponse {
  return !!(r as any).endGame;
}
