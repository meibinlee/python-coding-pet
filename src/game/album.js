import { isCharacterId } from '../data/characters.js';

export const newAlbum = (characterId, now = Date.now()) => [
  { level: 1, characterId, reachedAt: new Date(now).toISOString(), legacy: false },
];
export function recordStage(album, level, characterId, now = Date.now()) {
  if (album.some(entry => entry.level === level)) return album;
  return [...album, { level, characterId, reachedAt: new Date(now).toISOString(), legacy: false }].sort((a,b)=>a.level-b.level);
}
export function normalizeAlbum(record, pet, now = Date.now()) {
  const entries = [];
  for (const entry of Array.isArray(record) ? record : []) {
    if (!entry || ![1,2,3].includes(entry.level) || entry.level > pet.level || entries.some(item=>item.level===entry.level)) continue;
    const time = typeof entry.reachedAt === 'string' ? Date.parse(entry.reachedAt) : NaN;
    const known = Number.isFinite(time) && time <= now;
    entries.push({ level: entry.level, characterId: pet.characterId,
      reachedAt: known ? new Date(time).toISOString() : null, legacy: !known || entry.legacy === true });
  }
  if (!entries.some(entry=>entry.level===pet.level)) entries.push({level:pet.level,characterId:pet.characterId,reachedAt:null,legacy:true});
  return entries.sort((a,b)=>a.level-b.level);
}
export function selectCharacter(state, characterId) {
  if (!isCharacterId(characterId) || state.pet.characterId) return state;
  return { ...state, pet: { ...state.pet, characterId, album: state.pet.album.map(entry=>({...entry,characterId})) } };
}
