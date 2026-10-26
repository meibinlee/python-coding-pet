import { newMaintenance, normalizeMaintenance } from './maintenance.js';
import { growth, newGrowthRecord, newRoom, ROOM_MESS_FEEDS } from './rules.js';
import { newHealth, SICK_XP_GRACE_MS } from './health.js';
import { NEED_KEYS, newNeeds, normalizeNeeds } from './needs.js';
import { newMeal, normalizeMeal, newMood, normalizeMood } from './meal.js';
import { newSleep, normalizeSleep, validSleep } from './sleep.js';
import { newVacation, normalizeVacation } from './vacation.js';
import { isCharacterId } from '../data/characters.js';
import { newAlbum, normalizeAlbum } from './album.js';
import { emptyDaily, koreanDate, quizPeriod, QUIZ_RESET_HOURS } from './time.js';
import { newWardrobe, normalizeWardrobe } from './shop.js';
import { newStreak, normalizeStreak } from './streak.js';
import { FAMILY_SIZE } from './family.js';

export const DEFAULT_PET_NAME = '파이썬';
export const SAVE_KEY = 'coding-pet-save-v1';
export const defaultPet = (now = Date.now()) => ({
  schemaVersion: 2,
  petName: DEFAULT_PET_NAME,
  characterId: null,
  album: newAlbum(null,now),
  hunger: 70,
  cleanliness: 70,
  affection: 70,
  totalXp: 0,
  level: 1,
  growth: newGrowthRecord(now),
  health: newHealth(),
  sleep: newSleep(),
  room: newRoom(),
  maintenance: newMaintenance(now),
  vacation: newVacation(),
  wardrobe: newWardrobe(),
  needs: newNeeds(now),
  meal: newMeal(),
  mood: newMood(),
  streak: newStreak(),
  graduates: [],
  familyAt: null,
  graduatedAt: null,
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

function normalizeGrowth(record, level, now) {
  if (!record || typeof record !== 'object') return newGrowthRecord(now);
  const startedAt = safeTimestamp(record.startedAt, now);
  const enteredAt = new Date(Math.max(Date.parse(startedAt), Date.parse(safeTimestamp(record.enteredAt, now)))).toISOString();
  const careDates = {};
  for (const stage of [1,2,3]) {
    const start = stage === 1 ? startedAt : enteredAt;
    const dates = Array.isArray(record.careDates?.[stage]) ? record.careDates[stage] : [];
    careDates[stage] = [...new Set(dates.filter(date => typeof date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) &&
      new Date(date).toISOString().slice(0,10) === date && date <= koreanDate(now) &&
      (stage !== level || date >= koreanDate(Date.parse(start)))))].sort().slice(0,stage===1?2:stage===2?4:1);
  }
  const since = level === 1 ? startedAt : enteredAt;
  return { startedAt, enteredAt, pausedMs: pauseMs(record.pausedMs,now-Date.parse(since)), careDates };
}

function pauseMs(value, max) {
  return Number.isSafeInteger(value) && value >= 0 && value <= Math.max(0,max) ? value : 0;
}
function normalizeHealth(record, level, now, lastCareAt) {
  const carePausedMs = level >= 2 ? pauseMs(record?.carePausedMs,now-Date.parse(lastCareAt)) : 0;
  if (level === 1 || !record || typeof record !== 'object' || !record.sickSince) return { ...newHealth(), carePausedMs };
  const sickSince = safeTimestamp(record.sickSince,now);
  const recoveryStartedAt = record.recoveryStartedAt
    ? new Date(Math.max(Date.parse(sickSince),Date.parse(safeTimestamp(record.recoveryStartedAt,now)))).toISOString() : null;
  const followUpAt = recoveryStartedAt && record.followUpAt ? safeTimestamp(record.followUpAt,now) : null;
  const validFollowUp = followUpAt && Date.parse(followUpAt) >= Date.parse(recoveryStartedAt) &&
    koreanDate(Date.parse(followUpAt)) !== koreanDate(Date.parse(recoveryStartedAt));
  const penalty = typeof record.xpPenaltyAt === 'string' ? Date.parse(record.xpPenaltyAt) : NaN;
  // Older or broken records count the long-illness days from now instead of charging past days.
  const xpPenaltyAt = penalty >= Date.parse(sickSince) + SICK_XP_GRACE_MS && penalty <= now + SICK_XP_GRACE_MS ? penalty : now + SICK_XP_GRACE_MS;
  return { sickSince, recoveryStartedAt, followUpAt: validFollowUp ? followUpAt : null, carePausedMs,
    recoveryPausedMs: recoveryStartedAt ? pauseMs(record.recoveryPausedMs,now-Date.parse(recoveryStartedAt)) : 0,
    cause: NEED_KEYS.includes(record.cause) ? record.cause : null, xpPenaltyAt: new Date(xpPenaltyAt).toISOString() };
}

function validRoom(record) {
  return record && Number.isInteger(record.feedings) && record.feedings >= 0 && record.feedings <= ROOM_MESS_FEEDS;
}

export function validateSave(data, now = Date.now()) {
  if (!data || ![1,2].includes(data.schemaVersion) || typeof data.petName !== 'string' ||
    !data.petName.trim() || data.petName.length > 20 ||
    !['hunger', 'cleanliness', 'affection'].every(key => Number.isInteger(data[key]) && data[key] >= 0 && data[key] <= 100) ||
    !Number.isSafeInteger(data.totalXp) || data.totalXp < 0 ||
    typeof data.lastUpdatedAt !== 'string' || !Number.isFinite(Date.parse(data.lastUpdatedAt))) return null;

  // Keep the existing storage key; migrate the payload without resetting the pet.
  const pet = Object.fromEntries(Object.keys(defaultPet(now))
    .filter(key => !['daily', 'lastCareAt', 'level', 'growth', 'schemaVersion', 'health', 'sleep', 'room', 'vacation', 'characterId', 'album', 'maintenance', 'wardrobe', 'needs', 'meal', 'mood', 'streak', 'graduates', 'familyAt', 'graduatedAt'].includes(key)).map(key => [key, data[key]]));
  pet.schemaVersion = 2;
  const savedLevel = [1,2,3].includes(data.level) ? data.level : 1;
  pet.level = data.schemaVersion === 1 ? Math.max(savedLevel,growth(data.totalXp).level) : savedLevel;
  pet.growth = data.schemaVersion === 1 ? newGrowthRecord(now) : normalizeGrowth(data.growth, pet.level, now);
  pet.characterId = isCharacterId(data.characterId) ? data.characterId : null;
  pet.album = normalizeAlbum(data.album,pet,now);
  const daily = data.daily;
  pet.daily = validDaily(daily) && daily.date === koreanDate(now)
    ? {
      date: daily.date,
      period: QUIZ_RESET_HOURS.includes(daily.period) && daily.period <= quizPeriod(now) ? daily.period : quizPeriod(now),
      count: daily.count,
      submittedIds: [...daily.submittedIds],
      careDone: daily.careDone === true,
      nursingDone: daily.careDone === true && daily.nursingDone === true,
      careActions: Array.isArray(daily.careActions)
        ? [...new Set(daily.careActions.filter(action => ['hunger', 'cleanliness', 'affection'].includes(action)))]
        : [],
    }
    : emptyDaily(now);
  pet.room = validRoom(data.room) ? { feedings: data.room.feedings } : newRoom();
  pet.sleep = normalizeSleep(data.sleep,now);
  pet.vacation = normalizeVacation(data.vacation,now);
  pet.wardrobe = normalizeWardrobe(data.wardrobe);
  pet.needs = normalizeNeeds(data.needs,pet.vacation.startedAt ? Date.parse(pet.vacation.startedAt) : now);
  pet.meal = normalizeMeal(data.meal,now);
  pet.mood = normalizeMood(data.mood,now);
  pet.maintenance = normalizeMaintenance(data.maintenance,pet.vacation.startedAt ? Date.parse(pet.vacation.startedAt) : now);
  pet.health = normalizeHealth(data.health, pet.level, now, data.lastCareAt);
  pet.lastCareAt = data.schemaVersion === 1 || data.health === undefined ? new Date(now).toISOString() : safeTimestamp(data.lastCareAt, now);
  if (data.schemaVersion === 1 && (pet.daily.careDone || pet.daily.careActions.length > 0)) {
    pet.growth.careDates[pet.level] = [koreanDate(now)];
  }
  pet.lastUpdatedAt = safeTimestamp(data.lastUpdatedAt, now);
  pet.streak = normalizeStreak(data.streak, now);
  pet.graduatedAt = typeof data.graduatedAt === 'string' ? safeTimestamp(data.graduatedAt, now) : null;
  normalizeFamily(pet, data, now);
  return pet;
}

// Graduates are adult pets of other characters, resting (on vacation) until the family reunites.
function normalizeFamily(pet, data, now) {
  pet.graduates = [];
  for (const record of Array.isArray(data.graduates) ? data.graduates.slice(0, FAMILY_SIZE - 1) : []) {
    const member = record && typeof record === 'object' && validateSave({ ...record, graduates: [], familyAt: null }, now);
    if (!member || member.level !== 3 || !member.characterId || member.characterId === pet.characterId ||
      pet.graduates.some(graduate => graduate.characterId === member.characterId)) continue;
    pet.graduates.push({ ...member, streak: newStreak(), graduatedAt: member.graduatedAt ?? member.lastUpdatedAt });
  }
  const time = typeof data.familyAt === 'string' ? Date.parse(data.familyAt) : NaN;
  const together = pet.level === 3 && pet.graduates.length === FAMILY_SIZE - 1 && Number.isFinite(time) && time <= now;
  pet.familyAt = together ? new Date(time).toISOString() : null;
  if (!pet.familyAt) pet.graduates = pet.graduates.map(graduate => graduate.vacation.startedAt ? graduate : { ...graduate, vacation: { startedAt: new Date(now).toISOString() } });
}

export function loadPet(storage, now = Date.now()) {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(SAVE_KEY);
    if (raw === null) return { pet: defaultPet(now), isNew: true, error: '' };
    const data = JSON.parse(raw);
    const pet = validateSave(data, now);
    if (!pet) return { pet: defaultPet(now), isNew: true, error: '저장 기록을 읽을 수 없어 기본 상태로 복구했어요.' };
    const changedGrowth = JSON.stringify(data.growth) !== JSON.stringify(pet.growth);
    const oldGrowth = data.growth && { startedAt:data.growth.startedAt, enteredAt:data.growth.enteredAt, pausedMs:data.growth.pausedMs ?? 0, careDates:data.growth.careDates };
    const correctedGrowth = data.schemaVersion === 2 && JSON.stringify(oldGrowth) !== JSON.stringify(pet.growth);
    const oldHealth = data.health && { sickSince:data.health.sickSince,recoveryStartedAt:data.health.recoveryStartedAt,followUpAt:data.health.followUpAt,carePausedMs:data.health.carePausedMs ?? 0,recoveryPausedMs:data.health.recoveryPausedMs ?? 0,cause:data.health.cause ?? null,xpPenaltyAt:data.health.xpPenaltyAt === undefined ? pet.health.xpPenaltyAt : data.health.xpPenaltyAt };
    const changedHealth = JSON.stringify(data.health) !== JSON.stringify(pet.health);
    const correctedHealth = data.health !== undefined && JSON.stringify(oldHealth) !== JSON.stringify(pet.health);
    const changedVacation = JSON.stringify(data.vacation) !== JSON.stringify(pet.vacation);
    const correctedVacation = data.vacation !== undefined && changedVacation;
    const changedSleep = JSON.stringify(data.sleep) !== JSON.stringify(pet.sleep);
    const correctedSleep = data.sleep !== undefined && !validSleep(data.sleep,now);
    const changedRoom = JSON.stringify(data.room) !== JSON.stringify(pet.room);
    const correctedRoom = data.room !== undefined && !validRoom(data.room);
    const changedCharacter = data.characterId !== pet.characterId;
    const changedAlbum = JSON.stringify(data.album) !== JSON.stringify(pet.album);
    const invalidAlbum = data.album !== undefined && (!Array.isArray(data.album) || data.album.some(entry =>
      !entry || ![1,2,3].includes(entry.level) || entry.level > pet.level ||
      (entry.reachedAt !== null && (typeof entry.reachedAt !== 'string' || !Number.isFinite(Date.parse(entry.reachedAt)) || Date.parse(entry.reachedAt) > now))));
    const correctedCharacter = data.characterId !== undefined && data.characterId !== null && changedCharacter;
    const changedMaintenance = JSON.stringify(data.maintenance) !== JSON.stringify(pet.maintenance);
    const changedWardrobe = JSON.stringify(data.wardrobe) !== JSON.stringify(pet.wardrobe);
    // Expired meal/mood timers are normal, so they only trigger a quiet re-save.
    const changedCare = ['needs','meal','mood'].some(key => JSON.stringify(data[key]) !== JSON.stringify(pet[key]));
    const correctedNeeds = data.needs !== undefined && JSON.stringify(data.needs) !== JSON.stringify(pet.needs);
    const changedFamily = ['streak', 'graduates', 'familyAt', 'graduatedAt'].some(key => JSON.stringify(data[key]) !== JSON.stringify(pet[key]));
    const correctedFamily = (data.graduates !== undefined && (!Array.isArray(data.graduates) || data.graduates.length !== pet.graduates.length ||
      (!pet.familyAt && data.graduates.some(graduate => !graduate?.vacation?.startedAt)))) ||
      (data.familyAt !== undefined && data.familyAt !== null && data.familyAt !== pet.familyAt) ||
      (data.streak !== undefined && JSON.stringify(data.streak) !== JSON.stringify(pet.streak));
    const corrected = correctedFamily || correctedNeeds || (data.wardrobe !== undefined && changedWardrobe) || (data.maintenance !== undefined && changedMaintenance) || correctedCharacter || invalidAlbum || correctedVacation || correctedRoom || correctedSleep || correctedGrowth || correctedHealth || (data.daily !== undefined && (!validDaily(data.daily) || data.daily.date > koreanDate(now))) ||
      Date.parse(data.lastUpdatedAt) > now ||
      (data.lastCareAt !== undefined && (typeof data.lastCareAt !== 'string' || !Number.isFinite(Date.parse(data.lastCareAt)) || Date.parse(data.lastCareAt) > now));
    return { pet, isNew: false, migrated: data.schemaVersion !== 2 || changedGrowth || changedHealth || changedVacation || changedSleep || changedRoom || changedCharacter || changedAlbum || changedMaintenance || changedWardrobe || changedCare || changedFamily || corrected, error: corrected ? '날짜 또는 돌봄 기록이 올바르지 않아 보정했어요. 펫과 경험치는 유지했어요.' : '' };
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

export function createPet(petName, characterId, now = Date.now()) {
  if (!isCharacterId(characterId)) throw new Error('친구를 선택해 주세요.');
  return { ...defaultPet(now), petName: petName.trim().slice(0,20) || DEFAULT_PET_NAME, characterId, album: newAlbum(characterId,now) };
}

// Raw saved payload for account sync; null when missing, unreadable or invalid.
export function readSave(storage, now = Date.now()) {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(SAVE_KEY);
    const data = raw === null ? null : JSON.parse(raw);
    return data && validateSave(data, now) ? data : null;
  } catch { return null; }
}

// Writes an account save as-is (keeping its timestamp) and reloads it through the normal migration path.
export function importSave(data, storage, now = Date.now()) {
  if (!validateSave(data, now)) return null;
  try {
    (storage ?? globalThis.localStorage).setItem(SAVE_KEY, JSON.stringify(data));
  } catch { return { pet: validateSave(data, now), isNew: false, saved: false }; }
  return { ...loadPet(storage, now), saved: true };
}
