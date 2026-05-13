export interface GameProgress {
  stars: number;
  highScore: number;
  timesPlayed: number;
}

const STORAGE_PREFIX = 'bimiboo_progress_';

function getKey(gameKey: string): string {
  return `${STORAGE_PREFIX}${gameKey}`;
}

export function getProgress(gameKey: string): GameProgress {
  try {
    const raw = localStorage.getItem(getKey(gameKey));
    if (raw) {
      return JSON.parse(raw) as GameProgress;
    }
  } catch {
    // Corrupted data, return defaults
  }
  return { stars: 0, highScore: 0, timesPlayed: 0 };
}

export function saveStars(gameKey: string, stars: number): void {
  try {
    const progress = getProgress(gameKey);
    progress.timesPlayed++;
    if (stars > progress.stars) {
      progress.stars = stars;
    }
    if (stars > progress.highScore) {
      progress.highScore = stars;
    }
    localStorage.setItem(getKey(gameKey), JSON.stringify(progress));
  } catch {
    // localStorage unavailable or full
  }
}

export function getTotalStars(): number {
  const all = getAllProgress();
  let total = 0;
  for (const key of Object.keys(all)) {
    total += all[key].stars;
  }
  return total;
}

export function getAllProgress(): Record<string, GameProgress> {
  const result: Record<string, GameProgress> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const gameKey = key.slice(STORAGE_PREFIX.length);
        const raw = localStorage.getItem(key);
        if (raw) {
          result[gameKey] = JSON.parse(raw) as GameProgress;
        }
      }
    }
  } catch {
    // localStorage unavailable
  }
  return result;
}
