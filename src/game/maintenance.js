import { isOnVacation } from './vacation.js';

export const CARE_INTERVAL_MS = 4 * 60 * 60 * 1000;
export const CARE_ACTIONS = ['hunger', 'cleanliness', 'affection'];
export const newMaintenance = (now = Date.now()) => Object.fromEntries(CARE_ACTIONS.map(action => [action, now]));
export function normalizeMaintenance(record, now = Date.now()) {
  return Object.fromEntries(CARE_ACTIONS.map(action => {
    const value = record?.[action];
    return [action, Number.isSafeInteger(value) && value >= 0 && value <= now ? value : now];
  }));
}
// Each anchor advances only by charged intervals, preserving the remainder.
export function refreshMaintenance(pet, now = Date.now()) {
  if (pet.level >= 3 || isOnVacation(pet)) return pet;
  const record = pet.maintenance ?? newMaintenance(now);
  let loss = 0;
  const maintenance = Object.fromEntries(CARE_ACTIONS.map(action => {
    const intervals = Math.max(0, Math.floor((now - record[action]) / CARE_INTERVAL_MS));
    loss += intervals;
    return [action, record[action] + intervals * CARE_INTERVAL_MS];
  }));
  if (!loss && pet.maintenance) return pet;
  return { ...pet, totalXp: Math.max(0, pet.totalXp - loss), maintenance };
}
export function recordMaintenance(pet, action, now = Date.now()) {
  if (!CARE_ACTIONS.includes(action) || pet.level >= 3) return pet;
  return { ...pet, maintenance: { ...(pet.maintenance ?? newMaintenance(now)), [action]: now } };
}
export function maintenanceRemaining(pet, action, now = Date.now()) {
  const time = isOnVacation(pet) ? Date.parse(pet.vacation.startedAt) : now;
  return Math.max(0, (pet.maintenance?.[action] ?? time) + CARE_INTERVAL_MS - time);
}
