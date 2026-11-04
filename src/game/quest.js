import { challengeTemplates } from '../data/challengeTemplates.js';
import { shuffle } from './questions.js';
import { DAY_MS, koreanDate, currentDaily } from './time.js';

// Daily quests: the 1st, 4th and 7th question a player opens each Korean day is a harder challenge.
// All three use the day's pattern (D01–D31 in a 31-day round) with different numbers; each round
// changes the numbers again. A correct challenge gives one star piece; a wrong one fails that quest.
export const QUEST_SLOTS = [0, 3, 6];
export const MAX_STARS = 999;
export const ROUND_DAYS = challengeTemplates.length;
export const newQuest = () => ({ date: null, results: [], stars: 0, items: [] });

function hash(text) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  return value;
}
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const dayNumber = date => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
// Round 0 starts with D01 on this date; every 31 days a new round starts again from D01.
export const FIRST_ROUND_DATE = '2026-11-01';
export function challengeDay(date) {
  const offset = dayNumber(date) - dayNumber(FIRST_ROUND_DATE);
  return { template: challengeTemplates[((offset % ROUND_DAYS) + ROUND_DAYS) % ROUND_DAYS], round: Math.floor(offset / ROUND_DAYS) };
}

// Four different options with exactly one answer: given distractors first, then nearby numbers.
export function challengeOptions(data, rng) {
  const correct = data.correctAnswer, candidates = [correct, ...data.distractors];
  if (/^-?\d+$/.test(correct)) { const n = Number(correct); candidates.push(...[1, -1, 2, -2, 3, 4].map(d => String(n + d))); }
  candidates.push('Error', 'None', 'Yes', 'No');
  const options = shuffle([...new Set(candidates)].slice(0, 4), rng);
  if (options.length !== 4 || options.filter(option => option === correct).length !== 1) throw new Error('도전 문제 보기 생성 실패');
  return options;
}

// A round's three questions: never repeated within the day, and different from the previous round's
// questions (up to 20 tries each). Rounds are built in order from round 0 and cached.
const roundCache = new Map();
function roundQuestions(template, round) {
  const key = r => `${template.id}:${r}`;
  if (roundCache.has(key(round))) return roundCache.get(key(round));
  // Fill missing earlier rounds oldest first, so each step only needs its cached previous round.
  let from = round;
  while (from > 1 && !roundCache.has(key(from - 2))) from--;
  for (let r = from - 1; r < round; r++) if (r >= 0) roundQuestions(template, r);
  const previous = round > 0 ? roundQuestions(template, round - 1).map(data => data.code) : [];
  const chosen = [];
  for (let k = 0; k < QUEST_SLOTS.length; k++) {
    let best = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const data = template.generate(seeded(hash(`${template.id}:${round}:${k}:${attempt}`)));
      if (chosen.some(other => other.code === data.code)) continue;
      best ??= data;
      if (!previous.includes(data.code)) { best = data; break; }
    }
    if (!best) throw new Error(`${template.id}: 하루 도전 문제 3개를 서로 다르게 만들지 못했어요.`);
    chosen.push(best);
  }
  roundCache.set(key(round), chosen);
  return chosen;
}

// The same date and slot always give the same question on every device. The three questions of a day differ.
export function challengeQuestion(date, index) {
  const { template, round } = challengeDay(date);
  const data = roundQuestions(template, round)[index];
  const { distractors, ...shown } = data;
  return { ...shown, options: challengeOptions(data, seeded(hash(`${date}:${index}:options`))),
    instanceId: `challenge-${date}-${index}`, templateId: template.id, title: template.title, category: template.category, difficulty: template.difficulty,
    challenge: { date, index } };
}

const todayResults = (quest, date) => quest.date === date ? quest.results : [];
export function questStatus(pet, now = Date.now()) {
  const date = koreanDate(now), quest = pet.quest ?? newQuest();
  const results = todayResults(quest, date);
  return { date, results, stars: quest.stars, items: quest.items, answered: currentDaily(pet, now).answered ?? 0 };
}

// Index of the challenge that the next opened question should be, or null for a normal question.
export function dueChallenge(pet, now = Date.now()) {
  const { results, answered } = questStatus(pet, now);
  const index = results.length;
  return index < QUEST_SLOTS.length && answered >= QUEST_SLOTS[index] ? index : null;
}

// Called after a challenge answer is accepted. Ignores stale or repeated challenges.
export function recordChallenge(pet, question, correct, now = Date.now()) {
  const date = koreanDate(now), quest = pet.quest ?? newQuest();
  const results = todayResults(quest, date);
  if (!question?.challenge || question.challenge.date !== date || question.challenge.index !== results.length) return pet;
  return { ...pet, quest: { ...quest, date, results: [...results, correct], stars: Math.min(MAX_STARS, quest.stars + (correct ? 1 : 0)) } };
}

// A quest item goes to every pet's wardrobe now and to every later generation.
export function exchangeQuestItem(state, item) {
  const pet = state.pet, quest = pet.quest ?? newQuest();
  if (!item?.questPrice || quest.items.includes(item.id) || quest.stars < item.questPrice) return state;
  const give = member => ({ ...member, wardrobe: { ...member.wardrobe, owned: [...new Set([...member.wardrobe.owned, item.id])] } });
  return { ...state, pet: { ...give(pet), quest: { ...quest, stars: quest.stars - item.questPrice, items: [...quest.items, item.id] }, graduates: pet.graduates.map(give) } };
}

export function normalizeQuest(record, validItemIds, now = Date.now()) {
  const date = typeof record?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.date) &&
    Number.isFinite(Date.parse(record.date)) && record.date <= koreanDate(now) ? record.date : null;
  const results = date && Array.isArray(record.results) && record.results.length <= QUEST_SLOTS.length && record.results.every(value => typeof value === 'boolean') ? [...record.results] : [];
  const stars = Number.isSafeInteger(record?.stars) && record.stars >= 0 ? Math.min(MAX_STARS, record.stars) : 0;
  const items = Array.isArray(record?.items) ? [...new Set(record.items.filter(id => validItemIds.includes(id)))] : [];
  return { date: results.length ? date : null, results, stars, items };
}
