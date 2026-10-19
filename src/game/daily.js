import { answerQuiz, advanceGrowth, applyRoomCare, refreshGrowth } from './rules.js';
import { refreshHealth, healthStatus, performCare } from './health.js';
import { startNap, refreshSleep } from './sleep.js';
import { isOnVacation, resumeVacation } from './vacation.js';
import { currentDaily } from './time.js';
import { loadPet, savePet } from './storage.js';
export const DAILY_LIMIT = 10;

export function submitDaily(state, answer, now = Date.now()) {
  const quiz = state.quiz;
  if (isOnVacation(state.pet) || !quiz || quiz.answered || !quiz.question.options.includes(answer)) return state;
  const daily = currentDaily(state.pet, now);
  if (daily.count >= DAILY_LIMIT || daily.submittedIds.includes(quiz.question.instanceId)) return state;
  const result = answerQuiz({...state,pet:refreshHealth(state.pet,now)}, answer);
  const pet = {...result.pet,
    health: result.quiz.correct ? { ...result.pet.health, carePausedMs: 0 } : result.pet.health,
    lastCareAt: result.quiz.correct ? new Date(now).toISOString() : result.pet.lastCareAt,
    daily: {
      ...daily,
      count: daily.count + 1,
      submittedIds: [...daily.submittedIds, quiz.question.instanceId],
      careActions: result.quiz.correct ? [...new Set([...daily.careActions,quiz.action])] : daily.careActions,
    },
  };
  const grown = advanceGrowth(refreshHealth(pet,now),now,result.quiz.correct);
  return {...result,pet:applyRoomCare(startNap(state.pet,grown,quiz.action,result.quiz.correct,now),quiz.action,result.quiz.correct)};
}

export function basicCare(state, now = Date.now()) {
  const daily = currentDaily(state.pet, now);
  if (!healthStatus(state.pet,now).canCare) return state;
  const cared = refreshSleep(performCare(state.pet,now),now);
  return {...state,pet:advanceGrowth({...cared,daily:{...daily,careDone:true,nursingDone:daily.nursingDone||Boolean(refreshHealth(state.pet,now).health.sickSince)}},now,true)};
}

// The lock covers read, adjudication and write across tabs of this origin.
// Without Web Locks, latest-save reconciliation still reduces stale overwrites.
export async function updateStored(state, update, { storage, locks = globalThis.navigator?.locks, now, preferMemory = false } = {}) {
  const run = () => {
    const time = now ?? Date.now();
    const loaded = loadPet(storage, time);
    const latest = loaded.isNew || preferMemory ? state.pet : loaded.pet;
    const base = {...state,pet:latest};
    const result = update(base,time);
    if (result === base && !loaded.migrated && !preferMemory) return {state:base,saved:true,blocked:true};
    return {state:result,saved:savePet(result.pet,storage,time),blocked:result===base};
  };
  return locks?.request ? locks.request('coding-pet-save',run) : run();
}
export function submitStored(state, answer, options) {
  return updateStored(state,(base,now)=>submitDaily(base,answer,now),options);
}

export function setVacation(state, active, now = Date.now()) {
  if (isOnVacation(state.pet) === active) return state;
  if (!active) return refreshGrowth({ ...state, pet: resumeVacation(state.pet,now), quiz: null },now);
  const current = refreshGrowth(state,now);
  return { ...current, pet: { ...current.pet, vacation: { startedAt: new Date(now).toISOString() } }, quiz: null };
}
