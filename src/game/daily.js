import { answerQuiz } from './rules.js';
import { currentDaily } from './time.js';
import { loadPet, savePet } from './storage.js';
export const DAILY_LIMIT = 10;

export function submitDaily(state, answer, now = Date.now()) {
  const quiz = state.quiz;
  if (!quiz || quiz.answered || !quiz.question.options.includes(answer)) return state;
  const daily = currentDaily(state.pet, now);
  if (daily.count >= DAILY_LIMIT || daily.submittedIds.includes(quiz.question.instanceId)) return state;
  const result = answerQuiz(state, answer);
  return {...result, pet: {...result.pet, daily: {
    date: daily.date,
    count: daily.count + 1,
    submittedIds: [...daily.submittedIds, quiz.question.instanceId],
  }}};
}

// The lock covers read, adjudication and write across tabs of this origin.
// Without Web Locks, latest-save reconciliation still reduces stale overwrites.
export async function submitStored(state, answer, { storage, locks = globalThis.navigator?.locks, now = Date.now(), preferMemory = false } = {}) {
  const run = () => {
    const loaded = loadPet(storage, now);
    const latest = loaded.isNew || preferMemory ? state.pet : loaded.pet;
    const base = {...state,pet:latest};
    const result = submitDaily(base,answer,now);
    if (result === base) return {state:base,saved:true,blocked:true};
    return {state:result,saved:savePet(result.pet,storage),blocked:false};
  };
  return locks?.request ? locks.request('coding-pet-save',run) : run();
}
