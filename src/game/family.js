import { characters } from '../data/characters.js';
import { healthStatus } from './health.js';
import { recordStudy, newStreak } from './streak.js';
import { DAY_MS, currentDaily } from './time.js';
import { isOnVacation, resumeVacation, vacationTime } from './vacation.js';

// Each character is raised once. Graduates rest (frozen like a vacation) until the last one grows up.
export const GRADUATE_WAIT_MS = 3 * DAY_MS;
export const FAMILY_SIZE = characters.length;
export const isFamily = pet => Boolean(pet.familyAt);
export const familyPets = pet => isFamily(pet) ? [pet, ...pet.graduates] : [pet];
export const remainingCharacters = pet => characters.filter(character =>
  character.id !== pet.characterId && !pet.graduates.some(graduate => graduate.characterId === character.id));

export function graduationStatus(pet, now = Date.now()) {
  const sick = Boolean(healthStatus(pet, now).sick);
  const available = pet.level === 3 && Boolean(pet.characterId) && !isFamily(pet) && pet.graduates.length < FAMILY_SIZE - 1;
  const remainingMs = available ? Math.max(0, Date.parse(pet.growth.enteredAt) + GRADUATE_WAIT_MS + pet.growth.pausedMs - vacationTime(pet, now)) : 0;
  return { available, remainingMs, sick, ready: available && !isOnVacation(pet) && !sick && remainingMs === 0 };
}

// `next` is a freshly created egg. The learning record (today's questions, streak) stays with the player.
export function graduate(state, next, now = Date.now()) {
  const pet = state.pet;
  if (!graduationStatus(pet, now).ready || !remainingCharacters(pet).some(character => character.id === next.characterId)) return state;
  const { graduates, streak, ...rest } = pet;
  const resting = { ...rest, streak: newStreak(), graduates: [], familyAt: null, graduatedAt: new Date(now).toISOString(), vacation: { startedAt: new Date(now).toISOString() } };
  return { ...state, quiz: null, pet: { ...next, daily: currentDaily(pet, now), streak,
    graduates: [...graduates, resting],
    wardrobe: { ...next.wardrobe, owned: [...streak.rewards] },
  } };
}

// When the last egg grows up, the resting graduates wake up and join it.
export function reunite(pet, now = Date.now()) {
  if (isFamily(pet) || pet.level !== 3 || pet.graduates.length !== FAMILY_SIZE - 1) return pet;
  return { ...pet, familyAt: new Date(now).toISOString(), graduates: pet.graduates.map(graduate => resumeVacation(graduate, now)) };
}

// Applies `update` (state => state) to family member `index` (0 = current pet).
export function updateMember(state, index, update) {
  if (index === 0) return update(state);
  const member = isFamily(state.pet) ? state.pet.graduates[index - 1] : null;
  if (!member) return state;
  const result = update({ ...state, pet: member });
  if (result.pet === member) return state;
  return { ...state, pet: { ...state.pet, graduates: state.pet.graduates.map((graduate, i) => i === index - 1 ? result.pet : graduate) } };
}

// Basic care and nursing are shared by the family and once a day, plus one first nursing for a new illness.
export function familyCanCare(pet, now = Date.now()) {
  if (isOnVacation(pet)) return false;
  return !currentDaily(pet, now).careDone || familyPets(pet).some(member => {
    const health = healthStatus(member, now);
    return health.sick && !health.recovering;
  });
}

// A correct answer counts a study day; new streak rewards go to every pet's wardrobe.
export function recordStudyDay(pet, now = Date.now()) {
  const streak = recordStudy(pet.streak, now);
  if (streak === pet.streak) return pet;
  const gained = streak.rewards.filter(id => !pet.streak.rewards.includes(id));
  const give = member => gained.length ? { ...member, wardrobe: { ...member.wardrobe, owned: [...new Set([...member.wardrobe.owned, ...gained])] } } : member;
  return { ...give(pet), streak, graduates: pet.graduates.map(give) };
}
