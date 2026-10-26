// Fixed UTC+9: Korean dates are independent of the device's local timezone.
export const DAY_MS = 24 * 60 * 60 * 1000;
const KOREA_OFFSET = 9 * 60 * 60 * 1000;
export function koreanDate(now = Date.now()) {
  return new Date(now + KOREA_OFFSET).toISOString().slice(0, 10);
}
export function nextKoreanMidnight(now = Date.now()) {
  return Date.parse(`${koreanDate(now)}T00:00:00+09:00`) + DAY_MS;
}
// Questions refill at these Korean hours; care records still reset once a day at midnight.
export const QUIZ_RESET_HOURS = [0, 7, 13, 19];
const HOUR_MS = 60 * 60 * 1000;
export function quizPeriod(now = Date.now()) {
  const hour = new Date(now + KOREA_OFFSET).getUTCHours();
  return QUIZ_RESET_HOURS.filter(start => hour >= start).pop();
}
export function nextQuizReset(now = Date.now()) {
  const midnight = Date.parse(`${koreanDate(now)}T00:00:00+09:00`);
  return [...QUIZ_RESET_HOURS.slice(1), 24].map(hour => midnight + hour * HOUR_MS).find(time => time > now);
}
const RESET_NAMES = { 0: '자정', 7: '아침 7시', 13: '오후 1시', 19: '저녁 7시' };
export const nextResetLabel = (now = Date.now()) => RESET_NAMES[quizPeriod(nextQuizReset(now))];
export function emptyDaily(now = Date.now()) {
  return { date: koreanDate(now), period: quizPeriod(now), count: 0, submittedIds: [], careDone: false, nursingDone: false, careActions: [] };
}
export function currentDaily(pet, now = Date.now()) {
  if (pet.daily?.date !== koreanDate(now)) return emptyDaily(now);
  // Older records have no period; treat them as the current one so no extra questions appear.
  const period = quizPeriod(now);
  return (pet.daily.period ?? period) === period ? pet.daily : { ...pet.daily, period, count: 0, submittedIds: [] };
}
export function formatWait(ms) {
  const minutes = Math.ceil(ms / 60000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
}
