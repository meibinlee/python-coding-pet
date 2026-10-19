import { DAY_MS, koreanDate, currentDaily } from './time.js';

export const newHealth = () => ({ sickSince: null, recoveryStartedAt: null, followUpAt: null });

export function refreshHealth(pet, now = Date.now()) {
  const health = pet.health;
  if (pet.level === 1) {
    return health.sickSince ? { ...pet, health: newHealth() } : pet;
  }
  if (health.sickSince) {
    if (health.recoveryStartedAt && health.followUpAt && now - Date.parse(health.recoveryStartedAt) >= DAY_MS) {
      return { ...pet, health: newHealth(), lastCareAt: new Date(now).toISOString() };
    }
    return pet;
  }
  const lastCare = Date.parse(pet.lastCareAt);
  if (now - lastCare > DAY_MS) {
    return { ...pet, health: { ...newHealth(), sickSince: new Date(lastCare + DAY_MS + 1).toISOString() } };
  }
  return pet;
}

export function healthStatus(pet, now = Date.now()) {
  const current = refreshHealth(pet, now);
  const health = current.health;
  const daily = currentDaily(current, now);
  const sick = Boolean(health.sickSince);
  const recovering = Boolean(health.recoveryStartedAt);
  const remainingMs = recovering ? Math.max(0, Date.parse(health.recoveryStartedAt) + DAY_MS - now) : 0;
  return {
    sick,
    recovering,
    remainingMs,
    needsFollowUp: recovering && !health.followUpAt,
    // A new illness may start after today's normal care was already used.
    extraNursing: sick && !recovering && daily.careDone,
    canCare: !daily.careDone || (sick && !recovering),
    nextCheckMs: sick ? (health.followUpAt ? remainingMs : 0)
      : current.level >= 2 ? Math.max(0, Date.parse(current.lastCareAt) + DAY_MS + 1 - now) : 0,
  };
}

// Caller checks availability and records the shared daily care flag.
export function performCare(pet, now = Date.now()) {
  let current = refreshHealth(pet, now);
  let health = current.health;
  if (health.sickSince) {
    if (!health.recoveryStartedAt) {
      health = { ...health, recoveryStartedAt: new Date(now).toISOString() };
    } else if (!health.followUpAt && koreanDate(now) !== koreanDate(Date.parse(health.recoveryStartedAt))) {
      health = { ...health, followUpAt: new Date(now).toISOString() };
    }
  }
  current = { ...current, health, lastCareAt: new Date(now).toISOString() };
  return refreshHealth(current, now);
}
