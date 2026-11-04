import { describe, it, expect } from 'vitest';
import { challengeTemplates } from '../src/data/challengeTemplates.js';
import { challengeQuestion, challengeDay, dueChallenge, questStatus, recordChallenge, exchangeQuestItem, normalizeQuest, newQuest, QUEST_SLOTS, ROUND_DAYS } from '../src/game/quest.js';
import { createPet, loadPet, savePet } from '../src/game/storage.js';
import { submitDaily, DAILY_LIMIT } from '../src/game/daily.js';
import { buyItem, questItems, itemFor } from '../src/game/shop.js';
import { graduate } from '../src/game/family.js';
import { DAY_MS, koreanDate, daysTogether } from '../src/game/time.js';

const start = Date.parse('2026-11-04T03:00:00Z');
const today = koreanDate(start);
const dateAt = n => koreanDate(start + n * DAY_MS);
function seeded(seed = 7) { return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; }
const quizFor = (pet, question, action = 'affection') => ({ pet, quiz: { action, answered: false, question } });
const wrong = question => question.options.find(option => option !== question.correctAnswer);
function memory() { const data = {}; return { getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); }, removeItem: k => { delete data[k]; } }; }

describe('31 daily challenge templates', () => {
  it('has D01–D31 with a daily quest title each', () => {
    expect(challengeTemplates.map(t => t.id)).toEqual(Array.from({ length: 31 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`));
    for (const t of challengeTemplates) expect(t.title).toMatch(/에 도전!$/);
    expect(new Set(challengeTemplates.map(t => t.title)).size).toBe(31);
  });
  for (const template of challengeTemplates) it(`${template.id}: 100 random cases with varied answers and clean Python layout`, () => {
    const rng = seeded(), answers = new Set();
    for (let i = 0; i < 100; i++) {
      const data = template.generate(rng);
      expect(data.code).not.toContain('\t');
      expect(data.code).not.toContain(';');
      for (const line of data.code.split('\n')) expect(line.match(/^ */)[0].length % 4).toBe(0);
      expect(data.distractors.every(value => typeof value === 'string')).toBe(true);
      answers.add(data.correctAnswer);
    }
    expect(answers.size).toBeGreaterThan(1);
  });
});

describe('daily challenge schedule', () => {
  it('shows every pattern once in a 31-day round and the same question on every device', () => {
    expect(ROUND_DAYS).toBe(31);
    const ids = Array.from({ length: 31 }, (_, i) => challengeDay(dateAt(i)).template.id);
    expect(new Set(ids).size).toBe(31);
    expect(challengeQuestion(today, 1)).toEqual(challengeQuestion(today, 1));
    expect(challengeDay('2026-11-01')).toMatchObject({ round: 0, template: { id: 'D01' } });
    expect(challengeDay('2026-12-02')).toMatchObject({ round: 1, template: { id: 'D01' } });
    expect(challengeQuestion('2036-05-17', 2).options).toHaveLength(4);
  });
  it('gives three different questions a day with four distinct options and one answer', () => {
    for (let day = 0; day < 62; day++) {
      const questions = QUEST_SLOTS.map((_, k) => challengeQuestion(dateAt(day), k));
      expect(new Set(questions.map(q => q.code)).size).toBe(3);
      for (const q of questions) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options.filter(option => option === q.correctAnswer)).toHaveLength(1);
        expect(q.title).toBe(challengeDay(dateAt(day)).template.title);
      }
    }
  });
  it('changes the numbers in the next round for the same pattern', () => {
    for (let day = 0; day < 31 * 6; day++) {
      const now = challengeQuestion(dateAt(day), 0), next = challengeQuestion(dateAt(day + 31), 0);
      expect(next.templateId).toBe(now.templateId);
      expect(next.code).not.toBe(now.code);
    }
  });
});

describe('daily quests in normal play', () => {
  const answerNormal = (state, id, time = start) => submitDaily(quizFor(state.pet, { instanceId: id, options: ['1', '2', '3', '4'], correctAnswer: '1', code: '', question: '', explanation: '' }), '1', time);

  it('makes the 1st, 4th and 7th question the challenge and rewards a correct one with a star', () => {
    let state = { pet: createPet('Py', 'usagi', start), quiz: null };
    expect(dueChallenge(state.pet, start)).toBe(0);
    const first = challengeQuestion(today, 0);
    state = submitDaily(quizFor(state.pet, first), first.correctAnswer, start);
    expect(state.quiz.correct).toBe(true);
    expect(questStatus(state.pet, start)).toMatchObject({ results: [true], stars: 1 });
    expect(state.pet.totalXp).toBe(10);
    expect(dueChallenge(state.pet, start)).toBeNull();
    state = answerNormal(state, 'n1'); state = answerNormal(state, 'n2');
    expect(dueChallenge(state.pet, start)).toBe(1);
    const second = challengeQuestion(today, 1);
    state = submitDaily(quizFor(state.pet, second), wrong(second), start);
    expect(questStatus(state.pet, start)).toMatchObject({ results: [true, false], stars: 1 });
  });
  it('counts the three challenges apart from the 10-question limit', () => {
    let state = { pet: createPet('Py', 'usagi', start), quiz: null };
    for (let i = 0; i < DAILY_LIMIT; i++) state = answerNormal(state, `n${i}`);
    expect(state.pet.daily.count).toBe(DAILY_LIMIT);
    for (let k = 0; k < 3; k++) {
      expect(dueChallenge(state.pet, start)).toBe(k);
      const q = challengeQuestion(today, k);
      state = submitDaily(quizFor(state.pet, q), q.correctAnswer, start);
      expect(state.pet.daily.count).toBe(DAILY_LIMIT);
    }
    expect(questStatus(state.pet, start)).toMatchObject({ results: [true, true, true], stars: 3 });
    expect(dueChallenge(state.pet, start)).toBeNull();
  });
  it('accepts each challenge once and ignores yesterday’s challenge', () => {
    const pet = createPet('Py', 'usagi', start), q = challengeQuestion(today, 0);
    const answered = submitDaily(quizFor(pet, q), q.correctAnswer, start);
    const again = { ...answered, quiz: { ...answered.quiz, answered: false } };
    expect(submitDaily(again, q.correctAnswer, start)).toBe(again);
    const old = challengeQuestion(dateAt(-1), 0), stale = quizFor(pet, old);
    expect(submitDaily(stale, old.correctAnswer, start)).toBe(stale);
    expect(recordChallenge(pet, old, true, start)).toBe(pet);
  });
  it('starts a new day with three new challenges and keeps the stars', () => {
    const pet = { ...createPet('Py', 'usagi', start), quest: { date: today, results: [true, true, false], stars: 2, items: [] } };
    expect(dueChallenge(pet, start)).toBeNull();
    expect(questStatus(pet, start + DAY_MS)).toMatchObject({ results: [], stars: 2 });
    expect(dueChallenge(pet, start + DAY_MS)).toBe(0);
  });
});

describe('quest-only items', () => {
  it('exchanges star pieces for items every pet keeps, never sold for XP', () => {
    expect(questItems.map(item => item.questPrice)).toEqual([5, 10, 15]);
    const adult = { ...createPet('Py', 'usagi', start), level: 3, totalXp: 999, quest: { ...newQuest(), stars: 6 } };
    expect(buyItem({ pet: adult }, 'cloud').pet).toBe(adult);
    const state = { pet: adult, quiz: null };
    expect(exchangeQuestItem(state, itemFor('clover'))).toBe(state);
    const next = exchangeQuestItem(state, itemFor('cloud'));
    expect(next.pet.quest).toMatchObject({ stars: 1, items: ['cloud'] });
    expect(next.pet.wardrobe.owned).toContain('cloud');
    expect(exchangeQuestItem(next, itemFor('cloud'))).toBe(next);
  });
  it('carries stars and items to the next generation', () => {
    const grownAt = start - 4 * DAY_MS;
    const pet = { ...createPet('Py', 'usagi', grownAt), level: 3, growth: { startedAt: new Date(grownAt).toISOString(), enteredAt: new Date(grownAt).toISOString(), pausedMs: 0, careDates: { 1: [], 2: [], 3: [] } },
      quest: { date: today, results: [true], stars: 4, items: ['cloud'] }, wardrobe: { owned: ['cloud'], equipped: { clothes: null, headband: 'cloud' } } };
    const next = graduate({ pet, quiz: null }, createPet('Egg', 'hachiware', start), start).pet;
    expect(next.quest).toMatchObject({ stars: 4, items: ['cloud'] });
    expect(next.wardrobe.owned).toContain('cloud');
    expect(next.graduates[0].quest).toEqual(newQuest());
  });
});

describe('saved quest records', () => {
  it('repairs broken records and keeps valid ones across reloads', () => {
    expect(normalizeQuest(null, ['cloud'], start)).toEqual(newQuest());
    expect(normalizeQuest({ date: '2999-01-01', results: [true], stars: -3, items: ['crown', 'cloud', 'cloud'] }, ['cloud'], start)).toEqual({ date: null, results: [], stars: 0, items: ['cloud'] });
    const valid = { date: today, results: [true, false], stars: 7, items: ['clover'] };
    expect(normalizeQuest(valid, ['clover'], start)).toEqual(valid);
    const storage = memory();
    savePet({ ...createPet('Py', 'usagi', start), quest: valid }, storage, start);
    const loaded = loadPet(storage, start + 1000);
    expect(loaded.pet.quest).toEqual(valid);
    expect(loaded.error).toBe('');
  });
});

it('counts the day a pet was met as day 1 in Korean time', () => {
  const met = Date.parse('2026-11-03T14:59:00Z'); // 23:59 KST on Nov 3
  expect(daysTogether(new Date(met).toISOString(), met)).toBe(1);
  expect(daysTogether(new Date(met).toISOString(), met + 2 * 60000)).toBe(2);
  expect(daysTogether(new Date(met).toISOString(), met + 10 * DAY_MS)).toBe(11);
  expect(daysTogether('broken', met)).toBe(1);
});
