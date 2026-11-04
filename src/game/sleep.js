import { isFull } from './meal.js';

export const NAP_MS = 10 * 60 * 1000;
export const newSleep = () => ({ startedAt: null, endsAt: null });

export function validSleep(record, now = Date.now()) {
  if (!record || typeof record !== 'object') return false;
  if (record.startedAt === null && record.endsAt === null) return true;
  if (typeof record.startedAt !== 'string' || typeof record.endsAt !== 'string') return false;
  const start = Date.parse(record.startedAt), end = Date.parse(record.endsAt);
  return Number.isFinite(start) && Number.isFinite(end) && start <= now && end - start === NAP_MS;
}
export function normalizeSleep(record, now = Date.now()) {
  return validSleep(record, now) && Date.parse(record.endsAt) > now
    ? { startedAt: new Date(record.startedAt).toISOString(), endsAt: new Date(record.endsAt).toISOString() }
    : newSleep();
}
export function sleepStatus(pet, now = Date.now()) {
  const remainingMs = pet.sleep.endsAt ? Math.max(0, Date.parse(pet.sleep.endsAt) - now) : 0;
  return { sleeping: remainingMs > 0, remainingMs };
}
export function refreshSleep(pet, now = Date.now()) {
  return pet.sleep.startedAt && !sleepStatus(pet, now).sleeping ? { ...pet, sleep: newSleep() } : pet;
}
export function startNap(before, after, action, correct, now = Date.now()) {
  if (!correct || action !== 'hunger' || after.hunger !== 100 || sleepStatus(before, now).sleeping) {
    return refreshSleep(after, now);
  }
  return { ...after, sleep: { startedAt: new Date(now).toISOString(), endsAt: new Date(now + NAP_MS).toISOString() } };
}

// Display only (no game effect): a care reaction lasts 5 seconds. After the questions run out,
// the pet loops: repeats its last action for 5 s, naps for 25 s, then stays awake for 15 s.
export const REACTION_MS = 5000;
export const REST_CYCLE = [['action', 5000], ['sleep', 25000], ['awake', 15000]];
const REST_CYCLE_MS = REST_CYCLE.reduce((sum, [, ms]) => sum + ms, 0);
export const ACTION_POSES = { hunger: 'eat', cleanliness: 'clean', affection: 'play' };
export function restPose(lastAction, startedAt, now = Date.now()) {
  if (!Number.isFinite(startedAt) || now < startedAt) return null;
  let phase = (now - startedAt) % REST_CYCLE_MS;
  for (const [pose, ms] of REST_CYCLE) {
    if (phase < ms) return pose === 'action' ? ACTION_POSES[lastAction] ?? null : pose === 'sleep' ? 'sleep' : null;
    phase -= ms;
  }
  return null;
}

// Feeding rests while napping or full; cleaning and play stay available.
export const isActionResting = (pet, action, now = Date.now()) => action === 'hunger' && (sleepStatus(pet, now).sleeping || isFull(pet, now));
