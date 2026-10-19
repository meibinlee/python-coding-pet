// Fixed UTC+9: Korean dates are independent of the device's local timezone.
export const DAY_MS = 24 * 60 * 60 * 1000;
const KOREA_OFFSET = 9 * 60 * 60 * 1000;
export function koreanDate(now = Date.now()) {
  return new Date(now + KOREA_OFFSET).toISOString().slice(0, 10);
}
export function nextKoreanMidnight(now = Date.now()) {
  return Date.parse(`${koreanDate(now)}T00:00:00+09:00`) + DAY_MS;
}
export function emptyDaily(now = Date.now()) {
  return { date: koreanDate(now), count: 0, submittedIds: [], careDone: false, careActions: [] };
}
export function currentDaily(pet, now = Date.now()) {
  return pet.daily?.date === koreanDate(now) ? pet.daily : emptyDaily(now);
}
