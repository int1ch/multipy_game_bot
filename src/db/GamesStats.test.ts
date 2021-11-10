import central from "../CentralStation";
import { GameStats } from "./GameStats";

const saver = new GameStats(central);
const telegramId = 1232;
let playerId: number;

afterAll(async () => {
  saver.deletePlayerByTelegramId(telegramId);
});
afterAll(() => {
  central.close();
});

test("Player", async () => {
  const p1 = await saver.savePlayer(telegramId, "33232", undefined);
  expect(p1).toBeTruthy();
  playerId = p1.playerId;
  expect(playerId).toBeTruthy();

  await saver.savePlayer(telegramId, "33232", "test", "2003", "3a");
  const p2 = await saver.getPlayerByTelegramId(telegramId);
  expect(p2).toBeTruthy();
  expect(p2!.name).toEqual("33232");
});

test("question stats", async () => {
  const p1 = await saver.saveGameQuestionResult(playerId, "test = ", 1000);
});
test("game stats", async () => {
  const p1 = await saver.saveGameResult(playerId, "test", 1000, 1);
});
