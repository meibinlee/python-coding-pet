// Two correct meals make the pet full; feeding pauses until the full time ends.
export const FEEDS_TO_FULL = 2;
export const FULL_MS = 3 * 60 * 60 * 1000;
export const newMeal = () => ({ feeds: 0, fullUntil: null });

export function normalizeMeal(record, now = Date.now()) {
  const until = typeof record?.fullUntil === 'string' ? Date.parse(record.fullUntil) : NaN;
  if (Number.isFinite(until) && until > now && until - now <= FULL_MS) return { feeds: 0, fullUntil: new Date(until).toISOString() };
  const feeds = record?.feeds;
  return { feeds: Number.isInteger(feeds) && feeds >= 0 && feeds < FEEDS_TO_FULL ? feeds : 0, fullUntil: null };
}

export const fullRemaining = (pet, now = Date.now()) => pet.meal?.fullUntil ? Math.max(0, Date.parse(pet.meal.fullUntil) - now) : 0;
export const isFull = (pet, now = Date.now()) => fullRemaining(pet, now) > 0;
export function refreshMeal(pet, now = Date.now()) {
  return pet.meal?.fullUntil && !isFull(pet, now) ? { ...pet, meal: newMeal() } : pet;
}
export function recordMeal(pet, now = Date.now()) {
  const feeds = (refreshMeal(pet, now).meal?.feeds ?? 0) + 1;
  return { ...pet, meal: feeds >= FEEDS_TO_FULL ? { feeds: 0, fullUntil: new Date(now + FULL_MS).toISOString() } : { feeds, fullUntil: null } };
}

// A cheerful or tidy look stays for a while after playing or cleaning.
export const MOOD_MS = 30 * 60 * 1000;
export const newMood = () => ({ kind: null, until: null });
export function normalizeMood(record, now = Date.now()) {
  const until = typeof record?.until === 'string' ? Date.parse(record.until) : NaN;
  return ['play', 'clean'].includes(record?.kind) && Number.isFinite(until) && until > now && until - now <= MOOD_MS
    ? { kind: record.kind, until: new Date(until).toISOString() } : newMood();
}
export const activeMood = (pet, now = Date.now()) => pet.mood?.until && Date.parse(pet.mood.until) > now ? pet.mood.kind : null;
export const startMood = (pet, kind, now = Date.now()) => ({ ...pet, mood: { kind, until: new Date(now + MOOD_MS).toISOString() } });
