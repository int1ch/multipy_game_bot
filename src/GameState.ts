import {
  Game,
  PlainGameState as InternalGameState,
  Question,
} from "./GameStateShifter";

export type mSeconds = number;
//Обертка
export class GameState {
  constructor(protected gameState: InternalGameState) {}

  static newGame(game: Game) {
    const state: InternalGameState = {
      questions: game.questions,
      questionN: -1,
      failedQuestions: {},
      score: 0,
      try: 0,
      startTs: 0,
      startQuestionTs: 0,
    };
    return new GameState(state);
  }
  public startGame() {
    const state = this.gameState;
    state.questionN = 0;
    state.startTs = new Date().getTime();
    state.startQuestionTs = new Date().getTime();
    state.score = 0;
    state.try = 0;
  }

  public get score() {
    return this.gameState.score;
  }
  public gameElapsedTimeMs(): mSeconds {
    return new Date().getTime() - this.gameState.startTs;
  }
  public questionElapsedTimeMs(): mSeconds {
    if (!this.gameState.startQuestionTs) {
      console.log("Invalid state:", this.gameState);
      throw new Error("startQuestionTs not set!");
    }
    return new Date().getTime() - this.gameState.startQuestionTs;
  }
  public getCurrentQuestion() {
    const n = this.gameState.questionN;
    const question = this.gameState.questions[n];
    return question;
  }
  public isLastQuestion() {
    const n = this.gameState.questionN;
    const questions = this.gameState.questions;
    return n + 1 >= questions.length;
  }
  //state modifiers
  public getCurrentQuestionAttempts() {
    return this.gameState.try;
  }
  public increaseQuestionAttempts() {
    this.gameState.try++;
    //save session
  }
  public stateNextQuestion() {
    this.gameState.questionN++;
    this.gameState.startQuestionTs = new Date().getTime();
  }
  public addCurrentQuestionToFailed(question: Question) {
    this.gameState.failedQuestions[question.text] = question.answer;
  }
  public get failedQuestions() {
    return this.gameState.failedQuestions;
  }
  public increaseScore() {
    this.gameState.score++;
  }
  public ref() {
    return this.gameState;
  }
}
