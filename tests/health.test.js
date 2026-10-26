import { it, expect } from 'vitest';
import { refreshHealth, healthStatus } from '../src/game/health.js';
import { refreshGrowth, advanceGrowth } from '../src/game/rules.js';
import { basicCare, submitDaily, updateStored, setVacation } from '../src/game/daily.js';
import { defaultPet, loadPet, savePet, validateSave, SAVE_KEY } from '../src/game/storage.js';
import { refreshNeeds, NEED_INTERVALS, trashCount, emptyNeed } from '../src/game/needs.js';
import { DAY_MS, koreanDate } from '../src/game/time.js';
const start=Date.parse('2026-10-19T14:59:00Z');
const HOUR=60*60*1000;
function baby(extra={}){return {...defaultPet(start),level:2,totalXp:170,...extra};}
function quiz(pet,id='q',action='affection'){return {pet,quiz:{action,answered:false,question:{instanceId:id,options:['4','5','6','7'],correctAnswer:'4'}}};}
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
const sick=(cause='hunger',time=start)=>refreshHealth(baby({[cause]:0}),time);
function firstNursing(pet=sick(),time=start){return basicCare({pet,quiz:null},time).pet;}

it('lowers each status at its own pace and keeps the partial interval',()=>{
  const pet=baby();
  const later=refreshNeeds(pet,start+6*HOUR+1000);
  expect([later.hunger,later.cleanliness,later.affection]).toEqual([64,67,66]);
  expect(later.needs.hunger).toBe(start+6*HOUR);
  expect(refreshNeeds(later,start+6*HOUR+2000)).toBe(later);
  expect(refreshNeeds(baby({hunger:2}),start+10*HOUR).hunger).toBe(0);
  expect(NEED_INTERVALS.hunger).toBeLessThan(NEED_INTERVALS.affection);
  expect(NEED_INTERVALS.affection).toBeLessThan(NEED_INTERVALS.cleanliness);
});
it('eggs never get sick, while babies and adults get sick when any status reaches 0 with its cause',()=>{
  expect(refreshHealth({...defaultPet(start),hunger:0},start).health.sickSince).toBeNull();
  expect(refreshHealth(baby(),start+50*DAY_MS).health.sickSince).toBeNull();
  for(const cause of ['hunger','cleanliness','affection']){
    expect(sick(cause).health).toMatchObject({sickSince:new Date(start).toISOString(),cause});
  }
  expect(refreshHealth({...baby(),level:3,affection:0},start).health.cause).toBe('affection');
  expect(emptyNeed(baby({cleanliness:0,affection:0}))).toBe('cleanliness');
});
it('an unattended baby becomes hungry and sick first after enough real time',()=>{
  const state={pet:baby(),quiz:null};
  expect(refreshGrowth(state,start+69*HOUR).pet.health.sickSince).toBeNull();
  const later=refreshGrowth(state,start+70*HOUR).pet;
  expect(later.hunger).toBe(0);expect(later.health.cause).toBe('hunger');
  expect(later.level).toBe(2);
});
it('vacation pauses status decay and resumes from the remaining time',()=>{
  const paused=setVacation({pet:baby(),quiz:null},true,start+30*60*1000);
  expect(refreshGrowth(paused,start+30*DAY_MS).pet.hunger).toBe(70);
  const resumed=setVacation(paused,false,start+10*DAY_MS);
  expect(refreshGrowth(resumed,start+10*DAY_MS+30*60*1000).pet.hunger).toBe(69);
});
it('correct answers refill the status and wrong answers do not',()=>{
  const pet=baby({affection:10});
  expect(submitDaily(quiz(pet),'4',start).pet.affection).toBe(25);
  expect(submitDaily(quiz(pet),'5',start).pet.affection).toBe(10);
});
it('shows litter from low cleanliness and removes some of it after cleaning',()=>{
  expect([75,60,40,20,0].map(trashCount)).toEqual([0,1,2,3,4]);
  const pet=baby({cleanliness:25});
  const cleaned=submitDaily(quiz(pet,'c','cleanliness'),'4',start).pet;
  expect(trashCount(cleaned.cleanliness)).toBeLessThan(trashCount(pet.cleanliness));
});
it('recovery needs nursing, 24 hours, another date and a refilled cause status',()=>{
  const first=firstNursing(sick('hunger'),start);
  expect(first.health.recoveryStartedAt).toBe(new Date(start).toISOString());
  const next=start+60000;expect(koreanDate(next)).not.toBe(koreanDate(start));
  const followed=basicCare({pet:first,quiz:null},next).pet;
  expect(followed.health.followUpAt).toBe(new Date(next).toISOString());
  expect(refreshHealth(followed,start+DAY_MS).health.sickSince).toBeTruthy();
  expect(healthStatus(followed,start+DAY_MS).needsRefill).toBe(true);
  const fed={...followed,hunger:30};
  expect(refreshHealth(fed,start+DAY_MS-1).health.sickSince).toBeTruthy();
  expect(refreshHealth(fed,start+DAY_MS).health.sickSince).toBeNull();
});
it('older illnesses without a cause recover without a status refill',()=>{
  const pet=baby({hunger:0});pet.health={...pet.health,sickSince:new Date(start).toISOString(),recoveryStartedAt:new Date(start).toISOString(),followUpAt:new Date(start+60000).toISOString(),cause:null};
  expect(refreshHealth({...pet,hunger:5},start+DAY_MS).health.sickSince).toBeNull();
});
it('same-day repeat nursing cannot start or complete recovery twice',()=>{
  const pet=firstNursing(),state={pet,quiz:null};
  expect(pet.daily.nursingDone).toBe(true);
  expect(basicCare(state,start+1000)).toBe(state);
  expect(pet.health.followUpAt).toBeNull();
});
it('permits one first-nursing exception after today’s care is already used',()=>{
  const pet=sick();pet.daily={...pet.daily,date:koreanDate(start),careDone:true};
  expect(healthStatus(pet,start).extraNursing).toBe(true);
  const first=basicCare({pet,quiz:null},start);
  expect(first.pet.health.recoveryStartedAt).toBeTruthy();
  expect(basicCare(first,start+1)).toBe(first);
});
it('sick pets can learn and receive rewards but growth waits for recovery',()=>{
  const pet={...sick('cleanliness'),totalXp:300};
  pet.growth.careDates[2]=Array.from({length:4},(_,i)=>koreanDate(start+i*DAY_MS));
  const now=start+4*DAY_MS;
  expect(advanceGrowth(pet,now).level).toBe(2);
  const rewarded=submitDaily(quiz(pet,'q','cleanliness'),'4',now).pet;
  expect(rewarded.cleanliness).toBeGreaterThan(0);expect(rewarded.level).toBe(2);
});
it('nursing remains available after all ten wrong submissions',()=>{
  let pet=sick();
  for(let i=0;i<10;i++)pet=submitDaily(quiz(pet,`wrong-${i}`),'5',start).pet;
  const cared=basicCare({pet,quiz:null},start).pet;
  expect(cared.daily.count).toBe(10);expect(cared.totalXp).toBe(120);
  expect(cared.health.recoveryStartedAt).toBeTruthy();
});
it('persists nursing across reloads and prevents duplicate nursing across stale tabs',async()=>{
  const storage=memory(),pet=sick();savePet(pet,storage,start);
  const stale={pet,quiz:null};
  await updateStored(stale,basicCare,{storage,locks:null,now:start});
  const duplicate=await updateStored(stale,basicCare,{storage,locks:null,now:start+1});
  expect(duplicate.blocked).toBe(true);
  const loaded=loadPet(storage,start+1).pet;
  expect(loaded.health.recoveryStartedAt).toBe(new Date(start).toISOString());
  expect(loaded.health.cause).toBe('hunger');
});
it('adds status timers to old saves without charging past time',()=>{
  const now=start+10*DAY_MS,storage=memory(),old=baby();delete old.health;delete old.needs;delete old.maintenance;
  storage.setItem(SAVE_KEY,JSON.stringify(old));
  const loaded=loadPet(storage,now);
  expect(loaded.migrated).toBe(true);expect(loaded.error).toBe('');
  expect(loaded.pet.needs.hunger).toBe(now);expect(loaded.pet.hunger).toBe(70);
  expect(refreshHealth(loaded.pet,now).health.sickSince).toBeNull();
});
it('repairs future and inconsistent nursing records and unknown causes without resetting the pet',()=>{
  const pet=baby();pet.health={sickSince:new Date(start+DAY_MS).toISOString(),recoveryStartedAt:'bad',followUpAt:new Date(start+2*DAY_MS).toISOString(),cause:'boredom'};
  const loaded=loadPet({getItem:()=>JSON.stringify(pet)},start);
  expect(loaded.error).toBeTruthy();expect(loaded.pet.totalXp).toBe(170);
  expect(loaded.pet.health.sickSince).toBe(new Date(start).toISOString());
  expect(loaded.pet.health.followUpAt).toBeNull();expect(loaded.pet.health.cause).toBeNull();
  expect(validateSave({...pet,level:1},start).health.sickSince).toBeNull();
});
it('serializes simultaneous first-nursing exceptions without restarting recovery',async()=>{
  const storage=memory(),pet=sick();
  pet.daily={...pet.daily,date:koreanDate(start),careDone:true};savePet(pet,storage,start);
  let queue=Promise.resolve();const locks={request(name,fn){const result=queue.then(fn);queue=result;return result;}};
  const states=await Promise.all([0,1].map(i=>updateStored({pet,quiz:null},basicCare,{storage,locks,now:start+i})));
  expect(states.filter(result=>result.blocked)).toHaveLength(1);
  expect(loadPet(storage,start+1).pet.health.recoveryStartedAt).toBe(new Date(start).toISOString());
});
