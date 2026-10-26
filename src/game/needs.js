import { isOnVacation } from './vacation.js';

// Each status falls by 1 per interval. Reaching 0 makes a baby or adult sick.
const HOUR_MS = 60 * 60 * 1000;
export const NEED_KEYS = ['hunger', 'cleanliness', 'affection'];
export const NEED_INTERVALS = { hunger: HOUR_MS, cleanliness: 2 * HOUR_MS, affection: 1.5 * HOUR_MS };
export const NEED_LABELS = { hunger: '배부름', cleanliness: '청결·면역', affection: '사랑' };
export const SICK_CAUSES = {
  hunger: '배가 너무 고파서 아파요',
  cleanliness: '주변이 더러워 면역력이 떨어져 아파요',
  affection: '외로워서 마음이 아파요',
};
export const LOW_NEED = 20;
export const RECOVER_NEED = 30;

export const newNeeds = (now = Date.now()) => Object.fromEntries(NEED_KEYS.map(key => [key, now]));
export function normalizeNeeds(record, now = Date.now()) {
  return Object.fromEntries(NEED_KEYS.map(key => {
    const value = record?.[key];
    return [key, Number.isSafeInteger(value) && value >= 0 && value <= now ? value : now];
  }));
}

// Anchors advance only by charged intervals so the partial interval carries over.
export function refreshNeeds(pet, now = Date.now()) {
  if (isOnVacation(pet)) return pet;
  const record = pet.needs ?? newNeeds(now);
  let changed = !pet.needs;
  const updated = { ...pet };
  const needs = {};
  for (const key of NEED_KEYS) {
    const steps = Math.max(0, Math.floor((now - record[key]) / NEED_INTERVALS[key]));
    needs[key] = record[key] + steps * NEED_INTERVALS[key];
    if (steps) { changed = true; updated[key] = Math.max(0, pet[key] - steps); }
  }
  return changed ? { ...updated, needs } : pet;
}

export const emptyNeed = pet => NEED_KEYS.find(key => pet[key] <= 0) ?? null;

// Litter around the pet follows cleanliness, so cleaning visibly removes some of it.
export function trashCount(cleanliness) {
  return cleanliness >= 70 ? 0 : cleanliness >= 50 ? 1 : cleanliness >= 30 ? 2 : cleanliness >= 10 ? 3 : 4;
}
