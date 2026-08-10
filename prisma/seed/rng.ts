/** Deterministic PRNG so `db:reset` reproduces the exact same league history.
 *  Screenshots, tests, and bug reports all stay meaningful across resets. */
export function createRng(seed: number) {
  let a = seed >>> 0;

  function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /** Uniform float in [min, max). */
    float: (min: number, max: number) => min + next() * (max - min),
    /** Uniform integer in [min, max]. */
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    bool: (probability = 0.5) => next() < probability,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    /** Approximately normal via central limit; clamped to keep tails sane. */
    normal: (mean: number, stdDev: number) => {
      const sum = next() + next() + next() + next() + next() + next();
      return mean + (sum - 3) * stdDev;
    },
    shuffle: <T>(items: T[]): T[] => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    /** Picks `count` distinct items. */
    sample: <T>(items: readonly T[], count: number): T[] => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out.slice(0, count);
    },
  };
}

export type Rng = ReturnType<typeof createRng>;
