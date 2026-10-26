import { refreshMaintenance, recordMaintenance } from './maintenance.js';
import { answerQuiz, advanceGrowth, applyRoomCare, refreshGrowth, clamp, WRONG_ANSWER_PENALTY } from './rules.js';
import { refreshHealth, performCare } from './health.js';
import { isFamily, familyPets, familyCanCare, recordStudyDay } from './family.js';
import { resumeStreak } from './streak.js';
import { startNap, refreshSleep } from './sleep.js';
import { refreshNeeds } from './needs.js';
import { recordMeal, startMood, isFull } from './meal.js';
import { isOnVacation, resumeVacation } from './vacation.js';
import { currentDaily } from './time.js';
import { loadPet, savePet } from './storage.js';
export const DAILY_LIMIT = 10;

export function submitDaily(state, answer, now = Date.now()) {
  const quiz = state.quiz;
  if (isOnVacation(state.pet) || !quiz || quiz.answered || !quiz.question.options.includes(answer)) return state;
  const daily = currentDaily(state.pet, now);
  if (daily.count >= DAILY_LIMIT || daily.submittedIds.includes(quiz.question.instanceId)) return state;
  // A full pet cannot eat more, even from a quiz opened before it became full. A family eats while anyone can.
  if (quiz.action === 'hunger' && familyPets(state.pet).every(member => isFull(member,now))) return state;
  const refreshed = refreshHealth(refreshNeeds(refreshMaintenance(state.pet,now),now),now);
  const result = answerQuiz({...state,pet:refreshed}, answer);
  const correct = result.quiz.correct;
  const fed = correct && !(quiz.action === 'hunger' && isFull(refreshed,now));
  const pet = {...(fed || !correct ? result.pet : {...result.pet,hunger:refreshed.hunger}),
    health: correct ? { ...result.pet.health, carePausedMs: 0 } : result.pet.health,
    lastCareAt: correct ? new Date(now).toISOString() : result.pet.lastCareAt,
    daily: {
      ...daily,
      count: daily.count + 1,
      submittedIds: [...daily.submittedIds, quiz.question.instanceId],
      careActions: correct ? [...new Set([...daily.careActions,quiz.action])] : daily.careActions,
    },
  };
  const cared = !fed ? pet : quiz.action === 'hunger' ? recordMeal(pet,now) : startMood(pet,quiz.action === 'cleanliness' ? 'clean' : 'play',now);
  const maintained = correct ? recordStudyDay(recordMaintenance(cared,quiz.action,now),now) : cared;
  const grown = advanceGrowth(refreshHealth(maintained,now),now,correct);
  const current = applyRoomCare(startNap(state.pet,grown,quiz.action,fed,now),quiz.action,fed);
  // In a family, one answer cares for everyone (each keeps its own XP and status).
  return {...result,pet:isFamily(current) ? {...current,graduates:current.graduates.map(member => answerMember(member,quiz.action,correct,now))} : current};
}

function answerMember(pet, action, correct, now) {
  const base = refreshHealth(refreshNeeds(pet,now),now);
  const fed = correct && !(action === 'hunger' && isFull(base,now));
  let next = {...base,totalXp:correct ? Math.min(Number.MAX_SAFE_INTEGER,base.totalXp + 10) : Math.max(0,base.totalXp - WRONG_ANSWER_PENALTY)};
  if (correct) next = {...next,health:{...next.health,carePausedMs:0},lastCareAt:new Date(now).toISOString()};
  if (fed) {
    next = {...next,[action]:clamp(next[action] + 15)};
    next = action === 'hunger' ? recordMeal(next,now) : startMood(next,action === 'cleanliness' ? 'clean' : 'play',now);
  }
  return applyRoomCare(startNap(base,refreshHealth(next,now),action,fed,now),action,fed);
}

export function basicCare(state, now = Date.now()) {
  const daily = currentDaily(state.pet, now);
  if (!familyCanCare(state.pet,now)) return state;
  const care = pet => refreshSleep(performCare(refreshNeeds(refreshMaintenance(pet,now),now),now),now);
  const sick = familyPets(state.pet).some(member => refreshHealth(member,now).health.sickSince);
  const cared = care(state.pet);
  const pet = isFamily(cared) ? {...cared,graduates:cared.graduates.map(care)} : cared;
  return {...state,pet:advanceGrowth({...pet,daily:{...daily,careDone:true,nursingDone:daily.nursingDone||sick}},now,true)};
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
  // Resting graduates keep their own pause; a reunited family goes on vacation together.
  const together = (pet, update) => isFamily(pet) ? { ...pet, graduates: pet.graduates.map(update) } : pet;
  if (!active) {
    const resumed = { ...resumeVacation(state.pet,now), streak: resumeStreak(state.pet.streak,state.pet.vacation.startedAt,now) };
    return refreshGrowth({ ...state, pet: together(resumed, member => resumeVacation(member,now)), quiz: null },now);
  }
  const current = refreshGrowth(state,now);
  const vacation = { startedAt: new Date(now).toISOString() };
  return { ...current, pet: together({ ...current.pet, vacation }, member => ({ ...member, vacation })), quiz: null };
}
