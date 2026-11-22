import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readUserItem, setStorageUser, writeUserItem } from "@/lib/userStorage";

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe("userStorage", () => {
  let store: ReturnType<typeof fakeStorage>;

  beforeEach(() => {
    store = fakeStorage();
    (globalThis as unknown as { window: unknown }).window = { localStorage: store };
  });
  afterEach(() => {
    setStorageUser(null);
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("holder dataene til to brukere adskilt", () => {
    setStorageUser("a");
    writeUserItem("plan", "A");
    setStorageUser("b");
    writeUserItem("plan", "B");
    expect(readUserItem("plan")).toBe("B");
    setStorageUser("a");
    expect(readUserItem("plan")).toBe("A");
  });

  it("flytter gamle data uten bruker-suffiks til første bruker som leser", () => {
    store.setItem("plan", "gammel");
    setStorageUser("a");
    expect(readUserItem("plan")).toBe("gammel");
    expect(store.getItem("plan")).toBeNull();
    setStorageUser("b");
    expect(readUserItem("plan")).toBeNull();
  });
});
