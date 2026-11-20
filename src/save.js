// Progress kept in the browser: unlocks, best times, medals, hidden gems,
// the chosen marble and options. Storage can be missing or throw (private
// windows, blocked site data), so every access is guarded and the game still
// runs with an in-memory copy.

const KEY = 'svmarble.save.v1';

export const LEVEL_IDS = ['1', '2', '3', '4', '5'];

/** Level names and pars for the menus, which don't build the levels themselves. */
export const LEVEL_INFO = {
  1: { name: 'Data Center', tagline: "Don't touch prod.", par: 60, ultra: 38 },
  2: { name: 'Open Plan', tagline: 'Stay aligned.', par: 75, ultra: 48 },
  3: { name: 'Mission Street', tagline: 'No driver. No mercy.', par: 105, ultra: 66 },
  4: { name: 'Hacker House', tagline: 'Pivot or perish.', par: 135, ultra: 85 },
  5: { name: 'The Post-ASI Future', tagline: 'Everything is fine.', par: 180, ultra: 95 },
};

const DEFAULT = {
  unlocked: 1, // highest level you may start
  best: {}, // level id -> seconds
  hidden: {}, // level id -> true once its Stealth Mode gem is found
  marble: 'rainbow',
  options: { music: 0.5, sound: 0.8, mouseSens: 0.0025, invertY: false },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const data = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT),
      ...data,
      options: { ...DEFAULT.options, ...(data.options ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export const save = load();

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Storage blocked: progress lasts for this page only.
  }
}

/** 'platinum' (Unicorn), 'gold' (Qualified), 'finish', or null. */
export function medalFor(id, time) {
  const info = LEVEL_INFO[id];
  if (time == null || !info) return null;
  if (time <= info.ultra) return 'platinum';
  if (time <= info.par) return 'gold';
  return 'finish';
}

export const MEDAL_NAMES = { platinum: 'Unicorn', gold: 'Qualified', finish: 'Finished' };

/**
 * Record a finish. Returns { best, newBest, medal }.
 */
export function recordFinish(id, time) {
  const prev = save.best[id];
  const newBest = prev == null || time < prev;
  if (newBest) save.best[id] = time;
  const idx = LEVEL_IDS.indexOf(id);
  if (idx >= 0) save.unlocked = Math.max(save.unlocked, Math.min(LEVEL_IDS.length, idx + 2));
  persist();
  return { best: save.best[id], newBest, medal: medalFor(id, time) };
}

export function recordHiddenGem(id) {
  if (save.hidden[id]) return false;
  save.hidden[id] = true;
  persist();
  return true;
}

export function hiddenCount() {
  return LEVEL_IDS.filter((id) => save.hidden[id]).length;
}

export function isUnlocked(id) {
  return LEVEL_IDS.indexOf(id) < save.unlocked;
}

/** The level "Play" starts: the first one without a finish, else Level 1. */
export function nextLevelToPlay() {
  return LEVEL_IDS.find((id) => save.best[id] == null && isUnlocked(id)) ?? '1';
}
