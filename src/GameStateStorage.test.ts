import { AsyncStateStorage } from "./GameStateStorage";

it("container test", async () => {
  interface X {
    x: boolean;
  }
  const store = new AsyncStateStorage<X>();
  const initial = { x: true };
  await store.write("a", initial);
  const returned = await store.read("a");
  // @ts-ignore
  expect(returned.x).toBe(true);
});

it("class storage test", async () => {
  class INC {
    private x: number = 0;
    constructor(value?: number) {
      if (value) {
        this.x = value;
      }
    }
    inc() {
      this.x++;
    }
    v() {
      return this.x;
    }
  }
  class NonCloneStorage extends AsyncStateStorage<INC> {
    clone = false;
  }

  const i1 = new INC(5);
  const store = new NonCloneStorage();
  await store.write("a", i1);
  const i2 = await store.read("a");
  // @ts-ignore
  expect(i2.x).toBe(5);
  expect(i2?.v()).toBe(5);
});
