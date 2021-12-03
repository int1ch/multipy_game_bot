import { EndGameTimer, Ticker, TimeElapsed } from "./GameTimer";
import { delay } from "./timer";

type TickerContructorPrams = ConstructorParameters<typeof Ticker>;

class ShortTestTicker extends Ticker {
  period = 50;
  maxTicks = 10;
  constructor(...args: TickerContructorPrams) {
    super(...args);
  }
}

describe("ticker", () => {
  it("several tics()", async () => {
    let ticks = 0;
    const ticker = new ShortTestTicker(() => {
      ticks++;
    });
    //ticker.debug();
    await delay(120);
    expect(ticks).toBe(2);
    ticker.stop();
  });
  it("several tics()", async () => {
    let ticks = 0;
    const ticker = new ShortTestTicker(() => {
      ticks++;
    });
    await delay(70);
    ticker.stop();
    await delay(70);
    expect(ticks).toBe(1);
    ticker.stop();
  });
  it("momental stop", async () => {
    let ticks = 0;
    const ticker = new ShortTestTicker(() => {
      ticks++;
    });
    ticker.stop();
    await delay(70);
    expect(ticks).toBe(0);
    // @ts-ignore
    expect(ticker.interval).toBe(undefined);
  });
});

describe("TimeElapsed", () => {
  it("restTime", async () => {
    const elapsed = new TimeElapsed(10);
    expect(elapsed.seconds).toBe(10);

    const restMs = elapsed.restMs();
    expect(restMs).toBeGreaterThan(9500);
    expect(restMs).toBeLessThan(10001);
    await delay(50);
    const restMs2 = elapsed.restMs();
    expect(restMs2).toBeGreaterThan(9500);
    expect(restMs - restMs2).toBeGreaterThan(50);
    expect(restMs - restMs2).toBeLessThan(75);
  });
});

describe("EndGameTimer", () => {
  const chatId = "123";
  it("final send Message: all gone", async () => {
    const sendMessage = jest.fn();
    const botApi = { sendMessage } as any;

    const timer = new EndGameTimer(botApi, chatId, {
      seconds: 10,
    });
    // @ts-ignore
    timer.finalTick();
    expect(sendMessage.mock.calls.length).toBeGreaterThan(0);
    expect(sendMessage).toMatchSnapshot();
    // @ts-ignore
    console.log("Interval info", timer.ticker.interval);
  });
  it("Edit Message", async () => {
    const editMessageText = jest.fn();
    const editMessage = jest.fn();
    const messageId = 1231;
    const botApi = { editMessageText, editMessage } as any;
    const timer = new EndGameTimer(botApi, chatId, {
      seconds: 10,
    });
    // @ts-ignore
    timer.setCountDownMessageId(messageId);
    // @ts-ignore
    timer.tick();
    //expect(editMessage.mock.calls.length).toBeGreaterThan(0);
    expect(editMessageText).toMatchSnapshot();
    timer.stop();
    // @ts-ignore
    console.log("Interval info2 ", timer.ticker.interval);
  });

  it("add Text", async () => {
    const timer = new EndGameTimer({} as any, chatId, {
      seconds: 10,
      shadow: true,
    });
    timer.stop();
    const added = timer.addElapsedText("ok");
    expect(added).toBe("Осталось 10 секунд.\nok");
    const replaced = timer.replaceElapsedText("Осталось 90 секунд\nxxx");
    expect(replaced).toBe("Осталось 10 секунд.\nxxx");
    const notReplaced = timer.replaceElapsedText("xxx\nxxx");
    expect(notReplaced).toBe("xxx\nxxx");
  });
});
