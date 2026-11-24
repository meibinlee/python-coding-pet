import { DAY_MS, koreanDate } from './time.js';

// Correct answers per Korean date for the last RECENT_DAYS days (used by the ranking). Shared by the family.
export const RECENT_DAYS = 7;
// 10 questions × 4 refills + 3 daily challenges.
export const DAY_SOLVE_LIMIT = 43;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const newActivity = () => ({});
const oldest = now => koreanDate(now - (RECENT_DAYS - 1) * DAY_MS);

export function normalizeActivity(record, now = Date.now()) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return newActivity();
  const from = oldest(now), today = koreanDate(now);
  return Object.fromEntries(Object.entries(record)
    .filter(([date, count]) => DATE.test(date) && date >= from && date <= today && Number.isSafeInteger(count) && count > 0)
    .map(([date, count]) => [date, Math.min(count, DAY_SOLVE_LIMIT)])
    .sort(([a], [b]) => a.localeCompare(b)));
}

export function recordSolve(activity, now = Date.now()) {
  const current = normalizeActivity(activity, now), today = koreanDate(now);
  return { ...current, [today]: Math.min((current[today] ?? 0) + 1, DAY_SOLVE_LIMIT) };
}

export const recentSolves = (activity, now = Date.now()) =>
  Object.values(normalizeActivity(activity, now)).reduce((sum, count) => sum + count, 0);

// Same formula as public.pet_ranking() in supabase/schema.sql: more pets raised, a longer
// current streak and more recent correct answers all move a player up.
export const RANKING_WEIGHTS = { pet: 50, streakDay: 5, recentSolve: 1 };
export const rankingScore = ({ pets, streak, recent }) =>
  pets * RANKING_WEIGHTS.pet + streak * RANKING_WEIGHTS.streakDay + recent * RANKING_WEIGHTS.recentSolve;

// The current pet plus every graduate.
export const petsRaised = pet => 1 + (pet.graduates?.length ?? 0);
