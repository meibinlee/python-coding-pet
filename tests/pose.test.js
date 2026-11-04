import { it, expect } from 'vitest';
import { restPose, REACTION_MS, REST_CYCLE } from '../src/game/sleep.js';
import { MOOD_MS } from '../src/game/meal.js';
import { createPet, loadPet, savePet } from '../src/game/storage.js';
import { submitDaily } from '../src/game/daily.js';

const t = Date.parse('2026-11-04T03:00:00Z');
function memory() { const data = {}; return { getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); }, removeItem: k => { delete data[k]; } }; }

it('shows care reactions for 5 seconds', () => {
  expect(REACTION_MS).toBe(5000);
  expect(MOOD_MS).toBe(5000);
});

it('loops last action 5 s, nap 25 s, awake 15 s after the questions run out', () => {
  expect(REST_CYCLE.map(([, ms]) => ms)).toEqual([5000, 25000, 15000]);
  expect(restPose('cleanliness', t, t)).toBe('clean');
  expect(restPose('affection', t, t + 4999)).toBe('play');
  expect(restPose('hunger', t, t + 1000)).toBe('eat');
  expect(restPose('hunger', t, t + 5000)).toBe('sleep');
  expect(restPose('hunger', t, t + 29999)).toBe('sleep');
  expect(restPose('hunger', t, t + 30000)).toBeNull();
  expect(restPose('hunger', t, t + 45000)).toBe('eat');
  expect(restPose('hunger', NaN, t)).toBeNull();
  expect(restPose('hunger', t + 1, t)).toBeNull();
});

it('remembers the last quiz action of the day across reloads', () => {
  const pet = createPet('Py', 'usagi', t);
  const question = { instanceId: 'q1', options: ['1', '2', '3', '4'], correctAnswer: '1', code: '', question: '', explanation: '' };
  const answered = submitDaily({ pet, quiz: { action: 'cleanliness', answered: false, question } }, '2', t).pet;
  expect(answered.daily.last).toEqual({ action: 'cleanliness', at: new Date(t).toISOString() });
  const storage = memory();
  savePet(answered, storage, t);
  expect(loadPet(storage, t + 1000).pet.daily.last).toEqual(answered.daily.last);
  savePet({ ...answered, daily: { ...answered.daily, last: { action: 'jump', at: 'x' } } }, storage, t);
  expect(loadPet(storage, t + 1000).pet.daily.last).toBeNull();
});
