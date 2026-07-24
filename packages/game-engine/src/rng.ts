/**
 * Deterministic seeded RNG. Pure and self-contained: identical seed + call
 * sequence always yields identical output. Used for evidence assignment,
 * question selection, and tie-breaks so that a match is fully reproducible
 * (ENG-008). No use of Math.random anywhere in the engine.
 */

/** Hash an arbitrary string seed into a 32-bit unsigned integer. */
export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, well-distributed 32-bit PRNG. */
function mulberry32(a: number): () => number {
  let state = a >>> 0;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Integer in [min, max] inclusive. */
  between(min: number, max: number): number;
  /** Pick one element; throws on empty array. */
  pick<T>(items: readonly T[]): T;
  /** Return a new array shuffled deterministically (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** Pick n distinct elements in deterministic order. */
  sample<T>(items: readonly T[], n: number): T[];
}

export function createRng(seed: string | number): Rng {
  const numericSeed = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  const next = mulberry32(numericSeed);

  const rng: Rng = {
    next,
    int(maxExclusive: number): number {
      if (maxExclusive <= 0) return 0;
      return Math.floor(next() * maxExclusive);
    },
    between(min: number, max: number): number {
      if (max < min) [min, max] = [max, min];
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error("rng.pick: empty array");
      return items[rng.int(items.length)]!;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const arr = items.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
      }
      return arr;
    },
    sample<T>(items: readonly T[], n: number): T[] {
      return rng.shuffle(items).slice(0, Math.max(0, Math.min(n, items.length)));
    },
  };
  return rng;
}
