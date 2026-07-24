import { describe, it, expect } from "vitest";
import { createRng, hashSeed } from "../src/rng";

describe("seeded RNG", () => {
  it("is deterministic for identical seeds (ENG-008 primitive)", () => {
    const a = createRng("seed-x");
    const b = createRng("seed-x");
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("differs across seeds", () => {
    const a = Array.from({ length: 10 }, (() => {
      const r = createRng("seed-a");
      return () => r.next();
    })());
    const b = Array.from({ length: 10 }, (() => {
      const r = createRng("seed-b");
      return () => r.next();
    })());
    expect(a).not.toEqual(b);
  });

  it("produces integers in range", () => {
    const r = createRng("range");
    for (let i = 0; i < 1000; i++) {
      const v = r.int(5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it("shuffle is a permutation and deterministic", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = createRng("s").shuffle(items);
    const s2 = createRng("s").shuffle(items);
    expect(s1).toEqual(s2);
    expect(s1.slice().sort((a, b) => a - b)).toEqual(items);
  });

  it("sample returns n distinct items", () => {
    const r = createRng("sample");
    const picked = r.sample([1, 2, 3, 4, 5], 3);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
  });

  it("hashSeed is stable", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
    expect(hashSeed("abc")).not.toBe(hashSeed("abd"));
  });
});
