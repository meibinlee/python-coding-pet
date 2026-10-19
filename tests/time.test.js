import { it, expect } from 'vitest';
import { koreanDate, nextKoreanMidnight, currentDaily, DAY_MS } from '../src/game/time.js';
import { defaultPet, validateSave } from '../src/game/storage.js';
const now = Date.parse('2026-10-19T14:59:59.999Z');
it('uses Korean midnight, including month and year boundaries', () => {
  expect(koreanDate(now)).toBe('2026-10-19');
  expect(koreanDate(now + 1)).toBe('2026-10-20');
  expect(nextKoreanMidnight(now)).toBe(now + 1);
  expect(nextKoreanMidnight(now + 1)).toBe(now + 1 + DAY_MS);
  expect(koreanDate(Date.parse('2026-12-31T15:00:00Z'))).toBe('2027-01-01');
});
it('extends legacy saves without losing names, stats or adult XP', () => {
  const legacy = {...defaultPet(now),petName:'오래된 친구',totalXp:250,hunger:12};
  delete legacy.daily;
  expect(validateSave(legacy,now)).toMatchObject({petName:'오래된 친구',totalXp:250,hunger:12,daily:{date:'2026-10-19',count:0}});
});
it('preserves valid daily records and resets stale, future or malformed records', () => {
  const pet = {...defaultPet(now),daily:{date:'2026-10-19',count:1,submittedIds:['one']}};
  expect(validateSave(pet,now).daily.count).toBe(1);
  expect(currentDaily(pet,now+1).count).toBe(0);
  for(const daily of [{date:'2026-10-20',count:1,submittedIds:['one']},{date:'2026-10-19',count:11,submittedIds:[]},{date:'2026-10-19',count:2,submittedIds:['one','one']}]) {
    expect(validateSave({...pet,daily},now)).toMatchObject({totalXp:0,daily:{count:0}});
  }
});
it('corrects future care timestamps while retaining the pet and reports recovery',async()=>{
  const {loadPet}=await import('../src/game/storage.js');
  const pet={...defaultPet(now),totalXp:190,lastCareAt:new Date(now+DAY_MS).toISOString(),lastUpdatedAt:new Date(now+DAY_MS).toISOString()};
  const storage={getItem:()=>JSON.stringify(pet)};
  const result=loadPet(storage,now);
  expect(result.isNew).toBe(false);expect(result.error).toBeTruthy();
  expect(result.pet.totalXp).toBe(190);
  expect(result.pet.lastCareAt).toBe(new Date(now).toISOString());
  expect(result.pet.lastUpdatedAt).toBe(new Date(now).toISOString());
});
it('preserves a complete checklist on reload and resets it at Korean midnight',()=>{
  const pet={...defaultPet(now),daily:{date:'2026-10-19',count:1,submittedIds:['a'],careDone:true,careActions:['hunger','unknown','hunger']}};
  expect(validateSave(pet,now).daily).toMatchObject({count:1,careDone:true,careActions:['hunger']});
  expect(validateSave(pet,now+1).daily).toMatchObject({count:0,careDone:false,careActions:[]});
});
