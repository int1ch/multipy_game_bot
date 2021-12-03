import { GameState } from "../GameState";
import { Question } from "./Interfaces";
import {
  PlayerStatsSaver,
  NextStateResponse,
  PreviousQuestion,
  QuestionResponse,
  EndGameResponse,
} from "./CommonGame";

/*
  Упрощенная реализация движка игры - за состояния отвечает другой обьект
*/

export class CommonStateGame {
  constructor(
    protected stateShifter: GameState,
    protected MAX_ATTEMPTS: number,
    protected statsSaver: PlayerStatsSaver
  ) {}
  public async startGame(): Promise<NextStateResponse> {
    const stateShifter = this.stateShifter;
    stateShifter.startGame();
    let response: NextStateResponse = await this.askQuestion();
    return response;
  }

  public async checkAnswer(text: string): Promise<NextStateResponse> {
    const stateShifter = this.stateShifter;
    const question = stateShifter.getCurrentQuestion();
    //todo prepare text
    if (question.answer === text) {
      //save question stat here
      //save game stat sovewere in here
      stateShifter.increaseScore();
      await this.saveQuestionStats(question, true);

      return await this.moveToNextQuestion();
    }
    stateShifter.addCurrentQuestionToFailed(question);
    return await this.reAskQuestion();
  }
  protected async reAskQuestion(): Promise<NextStateResponse> {
    const stateShifter = this.stateShifter;
    const attempts = stateShifter.getCurrentQuestionAttempts();
    if (attempts >= this.MAX_ATTEMPTS) {
      const question = stateShifter.getCurrentQuestion();
      await this.saveQuestionStats(question, true);

      return await this.moveToNextQuestion({ previousQuestionFailed: true });
    }
    stateShifter.increaseQuestionAttempts();
    return this.askQuestion({ previous: { same: true, attempts } });
  }
  protected async saveQuestionStats(question: Question, scored?: boolean) {
    const stateShifter = this.stateShifter;
    const text = question.text;
    const elapsedMs = stateShifter.questionElapsedTimeMs();
    if (scored) {
      this.statsSaver.saveQuestionStat(text, elapsedMs);
    }
  }

  protected async moveToNextQuestion(options?: {
    previousQuestionFailed?: boolean;
    scored?: boolean;
  }): Promise<NextStateResponse> {
    const stateShifter = this.stateShifter;
    const previousQuestionFailed = !!options?.previousQuestionFailed;

    const oldQuestion = stateShifter.getCurrentQuestion();
    const attempts = stateShifter.getCurrentQuestionAttempts();
    let askQuestionOptions: { previous: PreviousQuestion } | undefined;
    if (previousQuestionFailed) {
      askQuestionOptions = {
        previous: {
          failed: true,
          attempts,
          answer: oldQuestion.answer,
        },
      };
    }

    if (stateShifter.isLastQuestion()) {
      return await this.finishGame(askQuestionOptions);
    }

    stateShifter.stateNextQuestion();

    return this.askQuestion(askQuestionOptions);
  }

  protected async askQuestion(options?: {
    previous?: PreviousQuestion;
  }): Promise<QuestionResponse> {
    const stateShifter = this.stateShifter;
    const question = stateShifter.getCurrentQuestion();
    const previous = options?.previous;
    return {
      previous,
      question,
    };
  }

  public async finishGame(options?: {
    previousQuestionFailed?: boolean;
    previous?: PreviousQuestion;
  }): Promise<EndGameResponse> {
    const stateShifter = this.stateShifter;
    const previous = options?.previous;
    const timeTakenMs = stateShifter.gameElapsedTimeMs();
    const score = stateShifter.score;

    this.statsSaver.saveGameStat(score, timeTakenMs);
    return {
      previous,
      endGame: true,
      score,
      timeTakenMs,
    };
  }
}
