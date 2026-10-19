import { growth } from './rules.js';
import { emptyDaily, koreanDate } from './time.js';

export const SAVE_KEY = 'coding-pet-save-v1';
export const defaultPet = (now = Date.now()) => ({
  schemaVersion: 1,
  petName: '코코',
  hunger: 70,
  cleanliness: 70,
  affection: 70,
  totalXp: 0,
  level: 1,
  lastUpdatedAt: new Date(now).toISOString(),
  daily: emptyDaily(now),
  lastCareAt: new Date(now).toISOString(),
});

function validDaily(daily) {
  return daily && /^\d{4}-\d{2}-\d{2}$/.test(daily.date) &&
    Number.isInteger(daily.count) && daily.count >= 0 && daily.count <= 10 &&
    Array.isArray(daily.submittedIds) && daily.submittedIds.length === daily.count &&
    daily.submittedIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 200) &&
    new Set(daily.submittedIds).size === daily.count;
}

function safeTimestamp(value, now) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN;
  return new Date(Number.isFinite(time) && time <= now ? time : now).toISOString();
}

export function validateSave(data, now = Date.now()) {
  if (!data || data.schemaVersion !== 1 || typeof data.petName !== 'string' ||
    !data.petName.trim() || data.petName.length > 20 ||
    !['hunger', 'cleanliness', 'affection'].every(key => Number.isInteger(data[key]) && data[key] >= 0 && data[key] <= 100) ||
    !Number.isSafeInteger(data.totalXp) || data.totalXp < 0 ||
    typeof data.lastUpdatedAt !== 'string' || !Number.isFinite(Date.parse(data.lastUpdatedAt))) return null;

  // Extend v1 in place: keep the existing key, names, stats, XP and growth stage.
  const pet = Object.fromEntries(Object.keys(defaultPet(now))
    .filter(key => !['daily', 'lastCareAt', 'level'].includes(key)).map(key => [key, data[key]]));
  pet.level = growth(data.totalXp, [1,2,3].includes(data.level) ? data.level : 1).level;
  const daily = data.daily;
  pet.daily = validDaily(daily) && daily.date === koreanDate(now)
    ? {
      date: daily.date,
      count: daily.count,
      submittedIds: [...daily.submittedIds],
      careDone: daily.careDone === true,
      careActions: Array.isArray(daily.careActions)
        ? [...new Set(daily.careActions.filter(action => ['hunger', 'cleanliness', 'affection'].includes(action)))]
        : [],
    }
    : emptyDaily(now);
  pet.lastCareAt = safeTimestamp(data.lastCareAt, now);
  pet.lastUpdatedAt = safeTimestamp(data.lastUpdatedAt, now);
  return pet;
}

export function loadPet(storage, now = Date.now()) {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(SAVE_KEY);
    if (raw === null) return { pet: defaultPet(now), isNew: true, error: '' };
    const data = JSON.parse(raw);
    const pet = validateSave(data, now);
    if (!pet) return { pet: defaultPet(now), isNew: true, error: '저장 기록을 읽을 수 없어 기본 상태로 복구했어요.' };
    const corrected = (data.daily !== undefined && (!validDaily(data.daily) || data.daily.date > koreanDate(now))) ||
      Date.parse(data.lastUpdatedAt) > now ||
      (data.lastCareAt !== undefined && (typeof data.lastCareAt !== 'string' || !Number.isFinite(Date.parse(data.lastCareAt)) || Date.parse(data.lastCareAt) > now));
    return { pet, isNew: false, error: corrected ? '날짜 또는 일일 기록이 올바르지 않아 보정했어요. 펫과 경험치는 유지했어요.' : '' };
  } catch {
    return { pet: defaultPet(now), isNew: true, error: '저장소를 사용할 수 없거나 기록이 손상되었어요. 현재 게임은 계속할 수 있어요.' };
  }
}

export function savePet(pet, storage, now = Date.now()) {
  try {
    (storage ?? globalThis.localStorage).setItem(SAVE_KEY, JSON.stringify({ ...pet, lastUpdatedAt: new Date(now).toISOString() }));
    return true;
  } catch { return false; }
}

export function resetPet(storage) {
  try {
    (storage ?? globalThis.localStorage).removeItem(SAVE_KEY);
    return true;
  } catch { return false; }
}
