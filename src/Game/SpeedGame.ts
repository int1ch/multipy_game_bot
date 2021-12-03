import { GameState } from "../GameState";
import { GameTextGenerator, TextResponse } from "../GameTextGenerator";
import { EndGameTimer, GameTimerStorage } from "../GameTimer";
import logger from "../logger";
import { generateVariantGame } from "../VariantMultiplyGame";
import {
  chatIdType,
  apiType,
  CommonGame,
  CommonGameOptions,
  EndGameResponse,
  QuestionResponse,
} from "./CommonGame";
import { GAME_SPEED } from "./Interfaces";

interface SeedGameOptions extends CommonGameOptions {
  duration?: number;
  gameTimers: GameTimerStorage;
}
export class SpeedGame extends CommonGame {
  gameType = GAME_SPEED;
  MAX_ATTEMPTS = 0;
  DURATION = 30;
  INTERVAL = 1000;
  protected gameTimers: GameTimerStorage;
  constructor(options: SeedGameOptions) {
    super(options);
    if (options.duration) this.DURATION = options.duration;
    this.gameTimers = options.gameTimers ?? new GameTimerStorage();
    logger.debug("Speed game created");
  }
  public async startGame() {
    await this.startTimer();
    await super.startGame();
  }
  protected async startTimer() {
    const timer = new EndGameTimer(this.botapi, this.chatId, {
      seconds: this.DURATION,
      endCallBack: async () => {
        this.finishGame();
      },
    });
    //this.gameTimers.write(chatId, timer);
    await timer.sendCountdownMessage();
    logger.debug("Speed game timer started");
  }

  public generateQuestions() {
    //FIXME!
    return generateVariantGame(30);
  }
  public async processEndGameResponse(r: EndGameResponse, state: GameState) {
    const textResponse = await GameTextGenerator.FinishSpeedGame({
      takenTimeMs: r.timeTakenMs,
      score: r.score,
      failedQuestions: state.failedQuestions,
      playerId: this.playerId,
      stats: this.gameStats,
    });
    return textResponse;
  }

  protected async sendOtherCountDownMessage(n: number) {
    if (n <= 1) {
      return;
    }
    if (n % 5 !== 1) {
      return;
    }
    const timer = await this.gameTimers.read(this.chatId);
    if (!timer) {
      return timer;
    }
    await timer.sendCountdownMessage();
  }
  public async processQuestionResponse(
    response: QuestionResponse,
    state: GameState
  ): Promise<TextResponse> {
    if (response.question && !response.previous?.same) {
      await this.sendOtherCountDownMessage(state.getCurrentQuestionN());
    }
    return await super.processQuestionResponse(response, state);
  }
}
