import { DAY_MS, koreanDate } from './time.js';
import { isOnVacation, vacationTime } from './vacation.js';

// A study day is a Korean date with at least one correct answer. Rewards unlock once each.
export const STREAK_REWARDS = [
  { days: 7, itemId: 'sprout' },
  { days: 14, itemId: 'medal' },
  { days: 30, itemId: 'rainbow' },
];
export const newStreak = () => ({ count: 0, best: 0, lastDate: null, rewards: [] });
export const dayBefore = date => new Date(Date.parse(`${date}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
const alive = (streak, today) => streak.lastDate === today || streak.lastDate === dayBefore(today);

// Vacation days neither add to nor break the streak.
export function streakStatus(pet, now = Date.now()) {
  const streak = pet.streak ?? newStreak();
  const today = koreanDate(vacationTime(pet, now));
  const count = alive(streak, today) ? streak.count : 0;
  const next = STREAK_REWARDS.find(reward => !streak.rewards.includes(reward.itemId)) ?? null;
  return { count, best: streak.best, studiedToday: !isOnVacation(pet) && streak.lastDate === today, next, daysToNext: next ? Math.max(1, next.days - count) : 0 };
}

export function recordStudy(streak, now = Date.now()) {
  const today = koreanDate(now);
  if (streak.lastDate === today) return streak;
  const count = streak.lastDate === dayBefore(today) ? streak.count + 1 : 1;
  const rewards = [...streak.rewards, ...STREAK_REWARDS.filter(reward => reward.days <= count && !streak.rewards.includes(reward.itemId)).map(reward => reward.itemId)];
  return { count, best: Math.max(streak.best, count), lastDate: today, rewards };
}

// Called when a vacation ends: a streak alive at the start continues from the next study day.
export function resumeStreak(streak, startedAt, now = Date.now()) {
  const yesterday = dayBefore(koreanDate(now));
  if (!streak.lastDate || !alive(streak, koreanDate(Date.parse(startedAt))) || streak.lastDate >= yesterday) return streak;
  return { ...streak, lastDate: yesterday };
}

export function normalizeStreak(record, now = Date.now()) {
  const today = koreanDate(now);
  const date = record?.lastDate;
  const validDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date && date <= today;
  const count = Number.isSafeInteger(record?.count) && record.count > 0 && validDate ? record.count : 0;
  const best = Number.isSafeInteger(record?.best) && record.best >= count ? record.best : count;
  const rewards = STREAK_REWARDS.filter(reward => Array.isArray(record?.rewards) && record.rewards.includes(reward.itemId) && reward.days <= best).map(reward => reward.itemId);
  return { count, best, lastDate: count ? date : null, rewards };
}
