import { isCorrect } from './questions.js';
import { refreshSleep } from './sleep.js';
import { refreshHealth } from './health.js';
import { DAY_MS, koreanDate } from './time.js';

export const actions = { hunger: '먹이 주기', cleanliness: '청소하기', affection: '놀아주기' };
export const clamp = value => Math.max(0, Math.min(100, value));
export const WRONG_ANSWER_PENALTY = 5;
const STAGES = [
  { level: 1, name: '알', image: 'egg', start: 0, next: 50, duration: 2 * DAY_MS, days: 2 },
  { level: 2, name: '아기', image: 'baby', start: 50, next: 150, duration: 4 * DAY_MS, days: 4 },
  { level: 3, name: '성체', image: 'adult', start: 150, next: null, duration: 0, days: 0 },
];
// XP-only inference is used exclusively for pre-timeline saves.
export function growth(xp, savedLevel) {
  const level = savedLevel ?? (xp < 50 ? 1 : xp < 150 ? 2 : 3);
  return STAGES[level - 1];
}
export function newGrowthRecord(now = Date.now()) {
  const timestamp = new Date(now).toISOString();
  return { startedAt: timestamp, enteredAt: timestamp, careDates: { 1: [], 2: [], 3: [] } };
}
export function growthStatus(pet, now = Date.now()) {
  const stage = growth(pet.totalXp, pet.level);
  const since = pet.level === 1 ? pet.growth.startedAt : pet.growth.enteredAt;
  return {
    ...stage,
    xpRemaining: stage.next === null ? 0 : Math.max(0, stage.next - pet.totalXp),
    remainingMs: stage.next === null ? 0 : Math.max(0, Date.parse(since) + stage.duration - now),
    careDays: pet.growth.careDates[pet.level].length,
  };
}
export function advanceGrowth(pet, now = Date.now(), cared = false) {
  let updated = pet;
  const today = koreanDate(now);
  if (cared && pet.level < 3) {
    const dates = pet.growth.careDates[pet.level];
    const required = growth(pet.totalXp, pet.level).days;
    if (!dates.includes(today) && dates.length < required) {
      updated = { ...pet, growth: { ...pet.growth, careDates: { ...pet.growth.careDates, [pet.level]: [...dates, today] } } };
    }
  }
  const status = growthStatus(updated, now);
  if (status.next === null || status.xpRemaining > 0 || status.remainingMs > 0 || status.careDays < status.days || updated.health.sickSince) return updated;
  const nextLevel = updated.level + 1;
  // One transition only. The next stage's elapsed time starts right now.
  return { ...updated, level: nextLevel, lastCareAt: new Date(now).toISOString(), growth: {
    ...updated.growth,
    enteredAt: new Date(now).toISOString(),
    careDates: { ...updated.growth.careDates, [nextLevel]: (cared || updated.growth.careDates[updated.level].includes(today) || (updated.daily?.date === today && (updated.daily.careDone || updated.daily.careActions.length > 0))) ? [today] : [] },
  } };
}
export function refreshGrowth(state, now = Date.now()) {
  const pet = advanceGrowth(refreshSleep(refreshHealth(state.pet, now), now), now);
  return pet === state.pet ? state : { ...state, pet };
}
export function answerQuiz(state, answer) {
  if (!state.quiz || state.quiz.answered || !state.quiz.question.options.includes(answer)) return state;
  const correct = isCorrect(state.quiz.question, answer);
  const totalXp = correct ? Math.min(Number.MAX_SAFE_INTEGER, state.pet.totalXp + 10) : Math.max(0, state.pet.totalXp - WRONG_ANSWER_PENALTY);
  const pet = { ...state.pet, totalXp, ...(correct ? { [state.quiz.action]: clamp(state.pet[state.quiz.action] + 15) } : {}) };
  return { ...state, pet, quiz: { ...state.quiz, answered: true, selected: answer, correct, xpChange: totalXp - state.pet.totalXp } };
}
