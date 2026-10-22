import { it, expect } from 'vitest';
import { refreshHealth, healthStatus } from '../src/game/health.js';
import { refreshGrowth, advanceGrowth } from '../src/game/rules.js';
import { basicCare, submitDaily, updateStored } from '../src/game/daily.js';
import { defaultPet, loadPet, savePet, validateSave, SAVE_KEY } from '../src/game/storage.js';
import { DAY_MS, koreanDate } from '../src/game/time.js';
const start=Date.parse('2026-10-19T14:59:00Z');
function baby(){return {...defaultPet(start),level:2,totalXp:170};}
function quiz(pet,id='q'){return {pet,quiz:{action:'hunger',answered:false,question:{instanceId:id,options:['4','5','6','7'],correctAnswer:'4'}}};}
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
function firstNursing(time=start+DAY_MS+1){return basicCare({pet:baby(),quiz:null},time).pet;}
it('eggs never get sick, while baby illness begins strictly after 24 hours',()=>{
  expect(refreshHealth(defaultPet(start),start+50*DAY_MS).health.sickSince).toBeNull();
  expect(refreshHealth(baby(),start+DAY_MS).health.sickSince).toBeNull();
  expect(refreshHealth(baby(),start+DAY_MS+1).health.sickSince).toBeTruthy();
  expect(refreshHealth({...baby(),level:3},start+DAY_MS+1).health.sickSince).toBeTruthy();
});
it('protects a newly hatched baby and does not stack illness over a long absence',()=>{
  const pet={...defaultPet(start),totalXp:1000};pet.growth.careDates[1]=[koreanDate(start),koreanDate(start+DAY_MS)];
  const now=start+30*DAY_MS,born=refreshGrowth({pet,quiz:null},now).pet;
  expect(born.level).toBe(2);expect(refreshHealth(born,now).health.sickSince).toBeNull();
  const sick=refreshHealth(baby(),now);
  expect(refreshHealth(sick,now+30*DAY_MS)).toBe(sick);
  expect(sick.totalXp).toBe(170);expect(sick.level).toBe(2);
});
it('detects overdue illness before correct care and keeps nursing necessary',()=>{
  const now=start+DAY_MS+1;
  const result=submitDaily(quiz(baby()),'4',now);
  expect(result.pet.health.sickSince).toBeTruthy();
  expect(result.pet.health.recoveryStartedAt).toBeNull();
  expect(result.pet.lastCareAt).toBe(new Date(now).toISOString());
  expect(result.pet.totalXp).toBe(162);
});
it('normal care prevents illness without rewards while settling overdue maintenance',()=>{
  const now=start+DAY_MS-1;
  const result=basicCare({pet:baby(),quiz:null},now);
  expect(result.pet).toMatchObject({hunger:70,cleanliness:70,affection:70,totalXp:155,daily:{count:0,careDone:true,nursingDone:false}});
  expect(refreshHealth(result.pet,now+DAY_MS).health.sickSince).toBeNull();
  expect(refreshHealth(result.pet,now+DAY_MS+1).health.sickSince).toBeTruthy();
});
it('same-day repeat nursing cannot start or complete recovery twice',()=>{
  const now=start+DAY_MS+1;
  const pet=firstNursing(now),state={pet,quiz:null};
  expect(pet.daily.nursingDone).toBe(true);
  expect(pet.health.recoveryStartedAt).toBe(new Date(now).toISOString());
  expect(basicCare(state,now+1000)).toBe(state);
  expect(pet.health.followUpAt).toBeNull();
});
it('a different Korean date alone is insufficient but early follow-up is retained',()=>{
  const now=start+DAY_MS+1, pet=firstNursing(now),nextDate=now+60000;
  expect(koreanDate(nextDate)).not.toBe(koreanDate(now));
  const followed=basicCare({pet,quiz:null},nextDate).pet;
  expect(followed.health.followUpAt).toBe(new Date(nextDate).toISOString());
  expect(refreshHealth(followed,now+DAY_MS-1).health.sickSince).toBeTruthy();
  const healed=refreshHealth(followed,now+DAY_MS);
  expect(healed.health.sickSince).toBeNull();
  expect(healed.lastCareAt).toBe(new Date(now+DAY_MS).toISOString());
});
it('waiting 24 hours alone is insufficient, later-day nursing completes recovery',()=>{
  const now=start+DAY_MS+1,pet=firstNursing(now);
  expect(refreshHealth(pet,now+DAY_MS).health.sickSince).toBeTruthy();
  const healed=basicCare({pet,quiz:null},now+DAY_MS).pet;
  expect(healed.health.sickSince).toBeNull();
  expect(healed.totalXp).toBe(134);
  expect(healthStatus(healed,now+DAY_MS).canCare).toBe(false);
});
it('permits one first-nursing exception after today’s care is already used',()=>{
  const now=start+DAY_MS+1,pet=baby();
  pet.daily={...pet.daily,date:koreanDate(now),careDone:true};
  expect(healthStatus(pet,now).extraNursing).toBe(true);
  const first=basicCare({pet,quiz:null},now);
  expect(first.pet.health.recoveryStartedAt).toBeTruthy();
  expect(basicCare(first,now+1)).toBe(first);
});
it('sick pets can learn and receive rewards but growth waits for recovery',()=>{
  const now=start+4*DAY_MS,pet=refreshHealth({...baby(),totalXp:300},now);
  pet.growth.careDates[2]=Array.from({length:4},(_,i)=>koreanDate(start+i*DAY_MS));
  expect(advanceGrowth(pet,now).level).toBe(2);
  const rewarded=submitDaily(quiz(pet),'4',now).pet;
  expect(rewarded.totalXp).toBe(238);expect(rewarded.hunger).toBe(85);expect(rewarded.level).toBe(2);
  const first=basicCare({pet:rewarded,quiz:null},now);
  const healed=basicCare(first,now+DAY_MS).pet;
  expect(healed.health.sickSince).toBeNull();expect(healed.level).toBe(3);
});
it('nursing remains available after all ten wrong submissions',()=>{
  const now=start+DAY_MS+1;let pet=baby();
  for(let i=0;i<10;i++)pet=submitDaily(quiz(pet,`wrong-${i}`),'5',now).pet;
  const cared=basicCare({pet,quiz:null},now).pet;
  expect(cared.daily.count).toBe(10);expect(cared.totalXp).toBe(102);
  expect(cared.health.recoveryStartedAt).toBeTruthy();
});
it('does not re-infect immediately when a wrong answer coincides with timed recovery',()=>{
  const now=start+DAY_MS+1,first=firstNursing(now);
  const followed=basicCare({pet:first,quiz:null},now+60000).pet;
  const result=submitDaily(quiz(followed),'5',now+DAY_MS).pet;
  expect(result.health.sickSince).toBeNull();expect(result.lastCareAt).toBe(new Date(now+DAY_MS).toISOString());
});
it('persists nursing across reloads and prevents duplicate nursing across stale tabs',async()=>{
  const now=start+DAY_MS+1,storage=memory(),pet=baby();savePet(pet,storage,start);
  const stale={pet,quiz:null};
  await updateStored(stale,basicCare,{storage,locks:null,now});
  const duplicate=await updateStored(stale,basicCare,{storage,locks:null,now:now+1});
  expect(duplicate.blocked).toBe(true);
  expect(loadPet(storage,now+1).pet.health.recoveryStartedAt).toBe(new Date(now).toISOString());
});
it('starts a new health baseline for old saves while preserving existing growth and XP',async()=>{
  const now=start+10*DAY_MS,storage=memory(),old=baby();delete old.health;delete old.maintenance;
  storage.setItem(SAVE_KEY,JSON.stringify(old));
  const loaded=loadPet(storage,now);
  expect(loaded.migrated).toBe(true);expect(loaded.pet.growth).toEqual(old.growth);
  expect(loaded.pet.lastCareAt).toBe(new Date(now).toISOString());
  await updateStored({pet:loaded.pet,quiz:null},refreshGrowth,{storage,locks:null,now});
  const later=loadPet(storage,now+1000).pet;
  expect(later.lastCareAt).toBe(new Date(now).toISOString());expect(later.totalXp).toBe(170);
  expect(refreshHealth(later,now+1000).health.sickSince).toBeNull();
});
it('repairs future and inconsistent nursing records without resetting the pet',()=>{
  const pet=baby();pet.health={sickSince:new Date(start+DAY_MS).toISOString(),recoveryStartedAt:'bad',followUpAt:new Date(start+2*DAY_MS).toISOString()};
  const storage={getItem:()=>JSON.stringify(pet)},loaded=loadPet(storage,start);
  expect(loaded.error).toBeTruthy();expect(loaded.pet.totalXp).toBe(170);
  expect(loaded.pet.health.sickSince).toBe(new Date(start).toISOString());
  expect(loaded.pet.health.followUpAt).toBeNull();
  expect(validateSave({...pet,level:1},start).health.sickSince).toBeNull();
});
it('persists automatic recovery after an early follow-up without extra rewards or care dates',async()=>{
  const first=start+DAY_MS+1,storage=memory();
  const pet=basicCare({pet:firstNursing(first),quiz:null},first+60000).pet;
  savePet(pet,storage,first+60000);
  const state={pet,quiz:null},now=first+DAY_MS;
  const result=await updateStored(state,refreshGrowth,{storage,locks:null,now});
  const restored=loadPet(storage,now).pet;
  expect(restored.health.sickSince).toBeNull();expect(restored.totalXp).toBe(pet.totalXp-18);
  expect(restored.growth.careDates).toEqual(pet.growth.careDates);
  expect(restored.lastCareAt).toBe(new Date(now).toISOString());
  expect(result.saved).toBe(true);
});
it('serializes simultaneous first-nursing exceptions without restarting recovery',async()=>{
  const now=start+DAY_MS+1,storage=memory(),pet=baby();
  pet.daily={...pet.daily,date:koreanDate(now),careDone:true};savePet(pet,storage,now);
  let queue=Promise.resolve();const locks={request(name,fn){const result=queue.then(fn);queue=result;return result;}};
  const states=await Promise.all([0,1].map(i=>updateStored({pet,quiz:null},basicCare,{storage,locks,now:now+i})));
  expect(states.filter(result=>result.blocked)).toHaveLength(1);
  expect(loadPet(storage,now+1).pet.health.recoveryStartedAt).toBe(new Date(now).toISOString());
});
it('persists a corrected future care time instead of extending protection on each reload',async()=>{
  const storage=memory(),pet=baby();pet.lastCareAt=new Date(start+10*DAY_MS).toISOString();
  savePet(pet,storage,start);
  const loaded=loadPet(storage,start);
  await updateStored({pet:loaded.pet,quiz:null},refreshGrowth,{storage,locks:null,now:start});
  expect(loadPet(storage,start+1000).pet.lastCareAt).toBe(new Date(start).toISOString());
  expect(refreshHealth(loadPet(storage,start+DAY_MS+1).pet,start+DAY_MS+1).health.sickSince).toBeTruthy();
});
