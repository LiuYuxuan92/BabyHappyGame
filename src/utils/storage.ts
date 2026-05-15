export interface GameProgress {
  stars: number;
  highScore: number;
  timesPlayed: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  voiceEnabled: boolean;
  restReminderEnabled: boolean;
  difficulty: 'easy' | 'normal';
}

export interface AchievementSummary {
  totalStars: number;
  bonusStars: number;
  gamesPlayed: number;
  perfectGames: number;
  badges: string[];
}

const STORAGE_PREFIX = 'bimiboo_progress_';
const SETTINGS_KEY = 'bimiboo_settings';
const BONUS_KEY = 'bimiboo_bonus_stars';
const DAILY_REWARD_KEY = 'bimiboo_daily_reward_date';
const GUIDE_PREFIX = 'bimiboo_guide_seen_';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  voiceEnabled: true,
  restReminderEnabled: true,
  difficulty: 'easy',
};

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
  return total + getBonusStars();
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

export function getSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as GameSettings;
    }
  } catch {
    // localStorage unavailable
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
}

export function updateSettings(partial: Partial<GameSettings>): GameSettings {
  const next = { ...getSettings(), ...partial };
  saveSettings(next);
  return next;
}

export function hasSeenGuide(gameKey: string): boolean {
  try {
    return localStorage.getItem(`${GUIDE_PREFIX}${gameKey}`) === '1';
  } catch {
    return false;
  }
}

export function markGuideSeen(gameKey: string): void {
  try {
    localStorage.setItem(`${GUIDE_PREFIX}${gameKey}`, '1');
  } catch {
    // localStorage unavailable
  }
}

export function getBonusStars(): number {
  try {
    return Number(localStorage.getItem(BONUS_KEY) || '0');
  } catch {
    return 0;
  }
}

export function claimDailyReward(): { claimed: boolean; bonusStars: number } {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(DAILY_REWARD_KEY) === today) {
      return { claimed: false, bonusStars: getBonusStars() };
    }

    const bonusStars = getBonusStars() + 1;
    localStorage.setItem(DAILY_REWARD_KEY, today);
    localStorage.setItem(BONUS_KEY, `${bonusStars}`);
    return { claimed: true, bonusStars };
  } catch {
    return { claimed: false, bonusStars: 0 };
  }
}

export function getAchievementSummary(): AchievementSummary {
  const all = getAllProgress();
  const progressList = Object.values(all);
  const gamesPlayed = progressList.filter(progress => progress.timesPlayed > 0).length;
  const perfectGames = progressList.filter(progress => progress.stars >= 3).length;
  const bonusStars = getBonusStars();
  const totalStars = getTotalStars();
  const badges: string[] = [];

  if (gamesPlayed >= 1) badges.push('初次探索');
  if (gamesPlayed >= 5) badges.push('小小冒险家');
  if (perfectGames >= 3) badges.push('三星能手');
  if (totalStars >= 20) badges.push('星星收藏家');
  if (bonusStars >= 3) badges.push('坚持打卡');

  return { totalStars, bonusStars, gamesPlayed, perfectGames, badges };
}

export function getRecommendedGame(gameKeys: string[]): string {
  const sorted = [...gameKeys].sort((a, b) => {
    const ap = getProgress(a);
    const bp = getProgress(b);
    if (ap.stars !== bp.stars) return ap.stars - bp.stars;
    return ap.timesPlayed - bp.timesPlayed;
  });
  return sorted[0] ?? gameKeys[0] ?? '';
}
