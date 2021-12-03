import central from "./CentralStation";
import { Game } from "./Game/Interfaces";
import { GameProcessor } from "./GameProcessor";

afterAll(() => {
  central.close();
});

const threeQuestionsSpeedGame: Game = {
  questions: [
    { text: "a", answer: "a", variants: ["a", "b"] },
    { text: "b", answer: "b", variants: ["a", "b"] },
    { text: "c", answer: "c" },
  ],
  type: "SPEED",
};

const playerId = 1;

describe("speed question game", () => {
  test("start game with timer", async () => {
    const processor = GameProcessor.newGame(threeQuestionsSpeedGame, playerId);
    const response = await processor.startGame();
    expect(response.startEndTimer).toBeGreaterThan(10);
  });
});
