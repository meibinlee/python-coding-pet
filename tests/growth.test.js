import { it, expect } from 'vitest';
import { advanceGrowth, growthStatus, refreshGrowth } from '../src/game/rules.js';
import { defaultPet, validateSave, loadPet, savePet, SAVE_KEY } from '../src/game/storage.js';
import { submitDaily, basicCare, updateStored } from '../src/game/daily.js';
import { DAY_MS, koreanDate } from '../src/game/time.js';
const start = Date.parse('2026-10-19T14:59:00Z');
function ready(level=1) {
  const pet = {...defaultPet(start),level,totalXp:250};
  const dates = Array.from({length:level===1?2:4},(_,i)=>koreanDate(start+i*DAY_MS));
  pet.growth.careDates[level] = dates;
  return pet;
}
function memory() {const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
it('requires XP, actual elapsed time and distinct care dates together',()=>{
  const pet=ready();
  expect(advanceGrowth(pet,start+2*DAY_MS-1).level).toBe(1);
  expect(advanceGrowth(pet,start+2*DAY_MS).level).toBe(2);
  expect(advanceGrowth({...pet,totalXp:49},start+2*DAY_MS).level).toBe(1);
  pet.growth.careDates[1]=[koreanDate(start)];
  expect(advanceGrowth(pet,start+2*DAY_MS).level).toBe(1);
});
it('cannot replace 48 hours with a midnight crossing',()=>{
  let pet=advanceGrowth({...defaultPet(start),totalXp:100},start,true);
  pet=advanceGrowth(pet,start+60000,true);
  expect(pet.growth.careDates[1]).toHaveLength(2);
  expect(pet.level).toBe(1);
  expect(growthStatus(pet,start+60000).remainingMs).toBe(2*DAY_MS-60000);
});
it('requires 96 hours from actual baby entry and four dates',()=>{
  const pet=ready(2);
  expect(advanceGrowth(pet,start+4*DAY_MS-1).level).toBe(2);
  expect(advanceGrowth(pet,start+4*DAY_MS).level).toBe(3);
  expect(advanceGrowth({...pet,totalXp:149},start+4*DAY_MS).level).toBe(2);
  pet.growth.careDates[2].pop();
  expect(advanceGrowth(pet,start+4*DAY_MS).level).toBe(2);
});
it('advances at most once after a long absence and restarts the stage clock',()=>{
  const now=start+30*DAY_MS;
  const baby=advanceGrowth(ready(),now);
  expect(baby.level).toBe(2);expect(baby.growth.enteredAt).toBe(new Date(now).toISOString());
  expect(baby.lastCareAt).toBe(new Date(now).toISOString());
  expect(advanceGrowth(baby,now).level).toBe(2);
  expect(growthStatus(baby,now).remainingMs).toBe(4*DAY_MS);
});
it('records correct care or basic care, never wrong answers or passive visits',()=>{
  const pet=defaultPet(start);
  const state={pet,quiz:{action:'hunger',answered:false,question:{instanceId:'q',options:['4','5','6','7'],correctAnswer:'4'}}};
  expect(submitDaily(state,'5',start).pet.growth.careDates[1]).toEqual([]);
  expect(submitDaily(state,'4',start).pet.growth.careDates[1]).toEqual([koreanDate(start)]);
  const cared=basicCare(state,start);
  expect(cared.pet.growth.careDates[1]).toEqual([koreanDate(start)]);
  expect(basicCare(cared,start)).toBe(cared);
  expect(refreshGrowth(state,start)).toBe(state);
});
it('counts transition-day care in the new stage even if old dates were already full',()=>{
  const now=start+2*DAY_MS;
  const baby=basicCare({pet:ready(),quiz:null},now).pet;
  expect(baby.level).toBe(2);
  expect(baby.growth.careDates[2]).toEqual([koreanDate(now)]);
  const before=ready();before.daily={...before.daily,date:koreanDate(now),careDone:true};
  expect(advanceGrowth(before,now).growth.careDates[2]).toEqual([koreanDate(now)]);
});
it('migrates old stages and initializes clocks without resetting names, XP or daily usage',()=>{
  for(const [xp,level] of [[0,1],[70,2],[160,3]]){
    const old={...defaultPet(start),schemaVersion:1,petName:'친구',totalXp:xp,level};delete old.growth;
    const migrated=validateSave(old,start+DAY_MS);
    expect(migrated).toMatchObject({schemaVersion:2,petName:'친구',totalXp:xp,level});
    expect(migrated.growth.enteredAt).toBe(new Date(start+DAY_MS).toISOString());
    expect(migrated.lastCareAt).toBe(new Date(start+DAY_MS).toISOString());
  }
});
it('persists migration once so repeated visits do not restart the growth clock',async()=>{
  const storage=memory();const old={...defaultPet(start),schemaVersion:1};delete old.growth;
  storage.setItem(SAVE_KEY,JSON.stringify(old));
  await updateStored({pet:loadPet(storage,start).pet,quiz:null},refreshGrowth,{storage,locks:null,now:start});
  const result=await updateStored({pet:loadPet(storage,start+DAY_MS).pet,quiz:null},refreshGrowth,{storage,locks:null,now:start+DAY_MS});
  expect(result.state.pet.growth.startedAt).toBe(new Date(start).toISOString());
  expect(JSON.parse(storage.getItem(SAVE_KEY)).schemaVersion).toBe(2);
});
it('does not infer a new stage from XP when reloading a timed save',()=>{
  const storage=memory();savePet({...defaultPet(start),totalXp:250},storage,start);
  expect(loadPet(storage,start).pet.level).toBe(1);
  const baby={...ready(2),totalXp:0};
  expect(validateSave(baby,start+4*DAY_MS).level).toBe(2);
});
it('corrects future or malformed growth clocks and filters invalid care dates',()=>{
  const pet=ready();pet.growth.startedAt=new Date(start+DAY_MS).toISOString();
  pet.growth.enteredAt='bad';pet.growth.careDates[1]=['2026-02-30','2099-01-01',koreanDate(start),koreanDate(start)];
  const storage={getItem:()=>JSON.stringify(pet)};
  const result=loadPet(storage,start);
  expect(result.error).toBeTruthy();expect(result.pet.level).toBe(1);
  expect(result.pet.growth.startedAt).toBe(new Date(start).toISOString());
  expect(result.pet.growth.careDates[1]).toEqual([koreanDate(start)]);
});
it('keeps today’s completed care and question usage during legacy migration',()=>{
  const old={...defaultPet(start),schemaVersion:1,totalXp:80,level:2};delete old.growth;
  old.daily={date:koreanDate(start),count:1,submittedIds:['old-question'],careDone:true,careActions:[]};
  const pet=validateSave(old,start);
  expect(pet.daily).toMatchObject({count:1,careDone:true,submittedIds:['old-question']});
  expect(pet.growth.careDates[2]).toEqual([koreanDate(start)]);
});
it('persists a passive transition and never advances twice on repeated reload',async()=>{
  const storage=memory(), now=start+2*DAY_MS;
  savePet(ready(),storage,start);
  const result=await updateStored({pet:ready(),quiz:null},refreshGrowth,{storage,locks:null,now});
  expect(result.state.pet.level).toBe(2);
  expect(loadPet(storage,now).pet.level).toBe(2);
  const again=await updateStored(result.state,refreshGrowth,{storage,locks:null,now});
  expect(again.state.pet.growth.enteredAt).toBe(new Date(now).toISOString());
  expect(again.state.pet.level).toBe(2);
});
it('retries an unsaved growth transition without reverting to stale stored progress',async()=>{
  const storage=memory(), now=start+2*DAY_MS;savePet(ready(),storage,start);
  const write=storage.setItem;storage.setItem=()=>{throw Error('full');};
  const first=await updateStored({pet:ready(),quiz:null},refreshGrowth,{storage,locks:null,now});
  expect(first.saved).toBe(false);expect(first.state.pet.level).toBe(2);
  storage.setItem=write;
  const retry=await updateStored(first.state,refreshGrowth,{storage,locks:null,now:now+1000,preferMemory:true});
  expect(retry.saved).toBe(true);expect(loadPet(storage,now+1000).pet.level).toBe(2);
  expect(loadPet(storage,now+1000).pet.growth.enteredAt).toBe(new Date(now).toISOString());
});
