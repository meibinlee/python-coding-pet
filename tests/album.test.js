import { it, expect } from 'vitest';
import { createPet, loadPet, savePet, SAVE_KEY } from '../src/game/storage.js';
import { advanceGrowth, refreshGrowth } from '../src/game/rules.js';
import { normalizeAlbum, recordStage } from '../src/game/album.js';
import { setVacation, updateStored } from '../src/game/daily.js';
import { DAY_MS, koreanDate } from '../src/game/time.js';
const start=Date.parse('2026-10-19T12:00:00Z');
function readyBaby(){const pet={...createPet('friend','usagi',start),totalXp:200};pet.growth.careDates[1]=[koreanDate(start),koreanDate(start+DAY_MS)];return pet;}
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
it('records all three stages at their actual transition times with the chosen friend',()=>{
  const baby=advanceGrowth(readyBaby(),start+2*DAY_MS);
  baby.growth.careDates[2]=Array.from({length:4},(_,i)=>koreanDate(start+(i+2)*DAY_MS));
  const adult=advanceGrowth(baby,start+6*DAY_MS);
  expect(adult.album.map(e=>e.level)).toEqual([1,2,3]);
  expect(adult.album.map(e=>e.characterId)).toEqual(['usagi','usagi','usagi']);
  expect(adult.album.map(e=>e.reachedAt)).toEqual([start,start+2*DAY_MS,start+6*DAY_MS].map(t=>new Date(t).toISOString()));
});
it('never adds duplicate stage records on repeat refresh or reload',async()=>{
  const storage=memory(),pet=readyBaby();savePet(pet,storage,start);
  let state={pet,quiz:null};
  for(let i=0;i<3;i++)state=(await updateStored(state,refreshGrowth,{storage,locks:null,now:start+2*DAY_MS+i})).state;
  expect(loadPet(storage,start+2*DAY_MS+3).pet.album.filter(e=>e.level===2)).toHaveLength(1);
  expect(recordStage(state.pet.album,2,'usagi',start+4*DAY_MS)).toBe(state.pet.album);
});
it('keeps existing adults and marks unavailable historical times instead of inventing earlier stages',()=>{
  const pet={...createPet('old','chiikawa',start),level:3,totalXp:200};delete pet.album;
  const loaded=loadPet({getItem:()=>JSON.stringify(pet)},start);
  expect(loaded.error).toBe('');expect(loaded.pet.level).toBe(3);
  expect(loaded.pet.album).toEqual([{level:3,characterId:'chiikawa',reachedAt:null,legacy:true}]);
});
it('does not record growth during vacation, and records the eventual real resume-era time',()=>{
  const pet=readyBaby();const paused=setVacation({pet,quiz:null},true,start+DAY_MS);
  expect(refreshGrowth(paused,start+10*DAY_MS).pet.album).toHaveLength(1);
  const resumed=setVacation(paused,false,start+11*DAY_MS);
  const grown=refreshGrowth(resumed,start+12*DAY_MS).pet;
  expect(grown.album[1].reachedAt).toBe(new Date(start+12*DAY_MS).toISOString());
});
it('normalizes malformed and duplicate entries to at most one per attained stage',()=>{
  const pet={...createPet('friend','hachiware',start),level:2};
  const record=[null,{level:99},{level:3,reachedAt:new Date(start).toISOString()},
    {level:1,reachedAt:'bad'},{level:1,reachedAt:new Date(start).toISOString()},
    {level:2,reachedAt:new Date(start+DAY_MS).toISOString(),characterId:'unknown'}];
  const album=normalizeAlbum(record,pet,start);
  expect(album.map(e=>e.level)).toEqual([1,2]);expect(album.every(e=>e.characterId==='hachiware')).toBe(true);
  expect(album.every(e=>e.reachedAt===null&&e.legacy)).toBe(true);
});
it('preserves valid album images and dates across storage round-trips',()=>{
  const pet=advanceGrowth(readyBaby(),start+2*DAY_MS),storage=memory();
  savePet(pet,storage,start+2*DAY_MS);
  expect(loadPet(storage,start+2*DAY_MS).pet.album).toEqual(pet.album);
  expect(JSON.parse(storage.getItem(SAVE_KEY)).album).toEqual(pet.album);
});
it('recovers a damaged album without resetting the pet or earlier gameplay state',()=>{
  const pet={...createPet('friend','usagi',start),totalXp:40,album:'broken'};
  const loaded=loadPet({getItem:()=>JSON.stringify(pet)},start);
  expect(loaded.error).toBeTruthy();expect(loaded.pet.totalXp).toBe(40);
  expect(loaded.pet.characterId).toBe('usagi');expect(loaded.pet.album).toHaveLength(1);
  expect(loaded.pet.album[0].legacy).toBe(true);
});
