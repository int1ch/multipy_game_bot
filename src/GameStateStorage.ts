import { StorageAdapter } from "grammy";

interface GameState {
  gameId: string;
  score: number;
  startMs: number;
}
interface Scored {
  score: number;
}
type GameStateStorageInStorage<T> = Record<string, T>;

/*
  Mememory in process storage to simplyfy
  in general this async knex storage
*/

/* clone interfaces not prototyped objects */
function clone1<T>(from: T): T {
  return { ...from };
}

//кажеться вот тут я поймал суть
//дело же не в наследовании, а в как можно меньшей зоне отвественности
//что бы писалось быстро и просто

export class AsyncStateStorage<T extends Object> implements StorageAdapter<T> {
  protected clone = true;
  protected store: Map<string, T>;
  constructor(store?: Map<string, T>) {
    this.store = store ?? new Map();
  }
  public async read(
    chatId: string | number | undefined
  ): Promise<T | undefined> {
    if (chatId === undefined || chatId === "") {
      return undefined;
    }
    const value = this.store.get(String(chatId));
    if (this.clone) {
      return clone1(value);
    } //COPY
    return value;
  }
  public async write(chatId: string | number, state: T) {
    this.store.set(String(chatId), state);
  }
  public async delete(chatId: string | number) {
    this.store.delete(String(chatId));
  }
}

export class GameStateStorage<T extends Scored> extends AsyncStateStorage<T> {
  public async incScore(chatId: string) {
    const state = await this.read(chatId);
    if (state) {
      state.score++;
    }
  }
  public async finish(chatId: string) {
    const state = await this.read(chatId);
    if (!state) {
      return undefined;
    }
    this.delete(chatId);
    return state;
  }
}
