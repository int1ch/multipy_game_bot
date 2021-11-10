import exp from "constants";
import central from "./CentralStation";
import { GameProcessor } from "./GameProcessor";
import { GameState } from "./GameState";
import { PlainGameState } from "./GameStateShifter";
afterAll(() => {
  central.close();
});

const threeQuestionGame = {
  questions: [
    { text: "a", answer: "a", variants: ["a", "b"] },
    { text: "b", answer: "b", variants: ["a", "b"] },
    { text: "c", answer: "c" },
  ],
};

const playerId = 1;
const fixedTs = 1234567890;
function jClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

expect.extend({
  toBeTimestamp(received) {
    const t = typeof received;
    if (t !== "number") {
      return {
        message: () =>
          `expected ${received} to be a number(got ${t}) with milliseconds timestamp `,
        pass: false,
      };
    }
    const ts = new Date().getTime();
    const pass = received > ts - 10000 && received <= ts;
    if (pass) {
      return {
        message: () =>
          `not expected ${received} to be close with current ts:${ts}`,
        pass: true,
      };
    }
    return {
      message: () => `expected ${received} to be close with current ts:${ts}`,
      pass: false,
    };
  },
});
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeTimestamp(): R;
    }
  }
}

describe("3 question game", () => {
  let state!: PlainGameState;
  it("start", async () => {
    const processor = GameProcessor.newGame(threeQuestionGame, playerId);
    const response = await processor.startGame();
    state = processor.stateRef();

    expect(response.text).toBe("a");

    expect(state).toBeTruthy();
    expect(state.questionN).toBe(0);
    expect(state.questions).toHaveLength(3);
    expect(state.startQuestionTs).toBeTimestamp();
    expect(state.startTs).toBeTimestamp();
    const clone = jClone(state);
    clone.startQuestionTs = fixedTs;
    clone.startTs = fixedTs;
    expect(clone).toMatchSnapshot();
  });
  it("ask q2", async () => {
    const gameState = new GameState(state);
    const processor = new GameProcessor(gameState, playerId);
    const response = await processor.checkAnswer("a");

    const clone = jClone(state);
    clone.startQuestionTs = fixedTs;
    clone.startTs = fixedTs;
    expect(clone).toMatchSnapshot();

    expect(response.questionStat?.timeMs).not.toBeTimestamp();
    response.questionStat!.timeMs = 1;

    expect(response.text).toBe("b");
    expect(response.variants).toHaveLength(2);
    expect(response.questionStat).toBeTruthy();
    expect(response).toMatchSnapshot();
  });
  it("ask q3", async () => {
    const gameState = new GameState(state);
    const processor = new GameProcessor(gameState, playerId);
    const response = await processor.checkAnswer("b");
    state = processor.stateRef();

    expect(response.text).toBe("c");
    const clone = jClone(state);
    clone.startQuestionTs = fixedTs;
    clone.startTs = fixedTs;
    expect(clone).toMatchSnapshot();
  });
  it("finish", async () => {
    const gameState = new GameState(state);
    expect(gameState.isLastQuestion()).toBeTruthy();

    const processor = new GameProcessor(gameState, playerId);
    const response = await processor.checkAnswer("c");
    state = processor.stateRef();

    expect(response.gameStat).toBeTruthy();
    expect(response.gameStat?.score).toBe(3);
    expect(response.gameStat?.timeMs).not.toBeTimestamp();
    expect(response.endGame).toBeTruthy();
    expect(response.removeKeyboard).toBeTruthy();

    expect(state).toBeTruthy();
    expect(state.startQuestionTs).toBeTimestamp();
    expect(state.startTs).toBeTimestamp();
    const clone = jClone(state);
    clone.startQuestionTs = fixedTs;
    clone.startTs = fixedTs;
    expect(clone).toMatchSnapshot();
  });
});

describe("move to nextQuestion", () => {
  async function newGame() {
    const processor = GameProcessor.newGame(threeQuestionGame, playerId);
    const response = await processor.startGame();
    return processor;
  }

  test("normal way", async () => {
    const processor = await newGame();
    const response = await processor.moveToNextQuestion();
    expect(response.text).toBe("b");
  });
  test("failed way", async () => {
    const processor = await newGame();
    const response = await processor.moveToNextQuestion({
      previousQuestionFailed: true,
    });
    expect(response.text).toContain("b");
  });
});
