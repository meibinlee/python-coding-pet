import { isOnVacation, vacationTime } from './vacation.js';
import { DAY_MS, koreanDate, currentDaily } from './time.js';
import { emptyNeed, RECOVER_NEED } from './needs.js';

export const newHealth = () => ({ sickSince: null, recoveryStartedAt: null, followUpAt: null, carePausedMs: 0, recoveryPausedMs: 0, cause: null, xpPenaltyAt: null });
export const SICK_XP_GRACE_MS = 3 * DAY_MS;
export const SICK_XP_LOSS = 5;
// Older illnesses have no cause and need no status refill.
const needsRefill = pet => Boolean(pet.health.cause) && pet[pet.health.cause] < RECOVER_NEED;
// A long illness costs XP once per day from xpPenaltyAt until `until`, never below 0.
function chargeSickness(pet, until) {
  const due = Date.parse(pet.health.xpPenaltyAt);
  if (!(until >= due)) return pet;
  const days = Math.floor((until - due) / DAY_MS) + 1;
  return { ...pet, totalXp: Math.max(0, pet.totalXp - days * SICK_XP_LOSS), health: { ...pet.health, xpPenaltyAt: new Date(due + days * DAY_MS).toISOString() } };
}

export function refreshHealth(pet, now = Date.now()) {
  if (isOnVacation(pet)) return pet;
  const health = pet.health;
  if (pet.level === 1) {
    return health.sickSince ? { ...pet, health: newHealth() } : pet;
  }
  if (health.sickSince) {
    const recoverAt = health.recoveryStartedAt ? Date.parse(health.recoveryStartedAt) + DAY_MS + (health.recoveryPausedMs ?? 0) : Infinity;
    // Earlier actions already refreshed health, so an offline recovery happened when the 24 hours ended.
    if (health.followUpAt && now >= recoverAt && !needsRefill(pet)) {
      return { ...chargeSickness(pet, recoverAt), health: newHealth(), lastCareAt: new Date(now).toISOString() };
    }
    return chargeSickness(pet, now);
  }
  // Hunger, cleanliness (immunity) or affection (loneliness) at 0 makes the pet sick.
  const cause = emptyNeed(pet);
  return cause ? { ...pet, health: { ...newHealth(), carePausedMs: health.carePausedMs ?? 0, sickSince: new Date(now).toISOString(), cause, xpPenaltyAt: new Date(now + SICK_XP_GRACE_MS).toISOString() } } : pet;
}

export function healthStatus(pet, now = Date.now()) {
  const current = refreshHealth(pet, now);
  const health = current.health;
  const daily = currentDaily(current, now);
  const sick = Boolean(health.sickSince);
  const recovering = Boolean(health.recoveryStartedAt);
  const remainingMs = recovering ? Math.max(0, Date.parse(health.recoveryStartedAt) + DAY_MS + (health.recoveryPausedMs ?? 0) - vacationTime(pet,now)) : 0;
  return {
    sick,
    recovering,
    remainingMs,
    needsFollowUp: recovering && !health.followUpAt,
    cause: health.cause ?? null,
    needsRefill: sick && needsRefill(current),
    // A new illness may start after today's normal care was already used.
    extraNursing: sick && !recovering && daily.careDone,
    canCare: !isOnVacation(pet) && (!daily.careDone || (sick && !recovering)),
    nextCheckMs: isOnVacation(pet) ? 0 : sick && health.followUpAt ? remainingMs : 0,
  };
}

// Caller checks availability and records the shared daily care flag.
export function performCare(pet, now = Date.now()) {
  if (isOnVacation(pet)) return pet;
  let current = refreshHealth(pet, now);
  let health = current.health;
  if (health.sickSince) {
    if (!health.recoveryStartedAt) {
      health = { ...health, recoveryStartedAt: new Date(now).toISOString(), recoveryPausedMs: 0 };
    } else if (!health.followUpAt && koreanDate(now) !== koreanDate(Date.parse(health.recoveryStartedAt))) {
      health = { ...health, followUpAt: new Date(now).toISOString() };
    }
  }
  current = { ...current, health: { ...health, carePausedMs: 0 }, lastCareAt: new Date(now).toISOString() };
  return refreshHealth(current, now);
}
