import { Api, Bot, Context, RawApi } from "grammy";
import { GameResponse } from "./GameProcessor";
import { AsyncStateStorage } from "./GameStateStorage";
import { l10nSeconds, tgEscape } from "./GameTextGenerator";

import logger from "./logger";

export class GameTimerStorage extends AsyncStateStorage<EndGameTimer> {
  clone = false;
}

interface lastMessageToEdit {
  messageId: number;
  text: string;
}

export class TimeElapsed {
  protected startTime: Date;
  constructor(public readonly seconds: number = 30) {
    this.startTime = new Date();
  }
  public restMs() {
    const now = new Date();
    return -now.getTime() + this.startTime.getTime() + this.seconds * 1000;
  }
}
let TickerId = 0;
export class Ticker {
  protected interval: NodeJS.Timer | undefined;
  protected tickCount = 0;
  protected maxTics = 100;
  protected period = 1000;
  protected id: number;
  private stopFlag = false;

  constructor(
    protected tickCallback: () => void,
    period?: number,
    maxTics?: number
  ) {
    this.id = TickerId++;
    if (period) {
      this.period = period;
    }
    if (maxTics !== undefined && maxTics >= 0) {
      this.maxTics = maxTics;
    }
    // обходной маневр что бы осуществить полную иницилизацию extended Test Classes
    setImmediate(() => {
      //иначе stop может быть вызван до создания таймера
      if (this.stopFlag) {
        return;
      }
      const timer = setInterval(() => {
        //console.log("WTF? tick");
        this.tick();
      }, this.period);
      this.interval = timer;
      //console.log("Inited timer", this.id, this.interval);
    });
  }
  debug() {
    console.log("Ticker settings:", this.id, this.period, "ms ", this.maxTics);
  }
  tick() {
    this.tickCallback();

    if (this.maxTics) {
      this.tickCount++;
      if (this.tickCount >= this.maxTics) {
        this.stop();
      }
    }
  }
  stop() {
    this.stopFlag = true;
    //console.log("Stopping interval:", this.id, this.interval);
    if (this.interval) {
      clearInterval(this.interval);
      //console.log("Stopped interval:", this.id, this.interval);
    }
  }
}

type EndGameCallback = () => void;
interface EndGameTimerOptions {
  endCallBack?: EndGameCallback;
  tickTime?: number;
  shadow?: boolean;
  seconds?: number;
  startTs?: number;
  endTs?: number;
}

export class EndGameTimer {
  protected timeElapsed: TimeElapsed;
  protected ticker?: Ticker;

  protected goingOn: boolean = true;
  protected lastMessage: lastMessageToEdit | undefined;
  protected tickTime = 1000;
  //protected seconds: number = 30;
  protected endCallback?: EndGameCallback;
  protected countDownMessageId?: number;

  constructor(
    protected botApi: Api<RawApi>,
    public readonly chatId: string | number,
    optionsOrCallBack?: EndGameTimerOptions | EndGameCallback
  ) {
    let options: EndGameTimerOptions = {};
    if (typeof optionsOrCallBack == "function") {
      //callback mode
      this.endCallback = optionsOrCallBack;
    } else if (typeof optionsOrCallBack == "object") {
      //options mode;
      this.endCallback = optionsOrCallBack?.endCallBack;
      options = optionsOrCallBack;
      if (optionsOrCallBack.tickTime) {
        this.tickTime = optionsOrCallBack.tickTime;
      }
    }

    this.timeElapsed = new TimeElapsed(options.seconds);
    if (!options.shadow) {
      this.ticker = new Ticker(() => {
        try {
          this.tick();
        } catch (e) {
          logger.error(e);
        }
      }, this.tickTime);
      this.goingOn = true;
    }
  }
  public seconds() {
    return this.timeElapsed.seconds;
  }

  protected tick() {
    if (this.timeElapsed.restMs() < 0) {
      return this.finalTick();
    }

    this.updateCountdownMessage();
  }
  public stop() {
    this.ticker?.stop();
  }
  protected async finalTick() {
    const ticker = this.ticker;
    if (!ticker) {
      return;
    }
    ticker.stop();

    this.goingOn = false;
    //AWAIT?
    this.sendEndGameMessage();
    if (this.endCallback) {
      this.endCallback();
    }
  }

  public getElapsedText() {
    const seconds = Math.round(this.timeElapsed.restMs() / 1000);

    if (seconds < 0) {
      return "Время вышло";
    }
    if (seconds === 1) {
      return "Осталась секунда.";
    }
    const leftSeconds = l10nSeconds(seconds);
    return `Осталось ${leftSeconds}.`;
  }
  public addElapsedText(message: string) {
    return this.getElapsedText() + "\n" + message;
  }
  public replaceElapsedText(message: string) {
    const lines = message.split("\n");
    const timeLine = lines[0];
    if (!timeLine.startsWith("Осталось ")) {
      return message;
    }
    lines[0] = this.getElapsedText();
    return lines.join("\n");
  }

  protected async sendEndGameMessage() {
    //loating async function!
    await this.botApi.sendMessage(this.chatId, "Все, Время вышло.");
  }
  public async updateCountdownMessage() {
    if (!this.countDownMessageId) {
      return;
    }
    await this.botApi.editMessageText(
      this.chatId,
      this.countDownMessageId,
      this.getElapsedText()
    );
  }
  protected setCountDownMessageId(messageId: number) {
    this.countDownMessageId = messageId;
  }
  public async sendCountdownMessage() {
    const message = await this.botApi.sendMessage(
      this.chatId,
      this.getElapsedText()
    );
    this.setCountDownMessageId(message.message_id);
  }
}
