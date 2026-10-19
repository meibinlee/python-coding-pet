import { it, expect } from 'vitest';
import { NAP_MS, sleepStatus, startNap, isActionResting } from '../src/game/sleep.js';
import { defaultPet, savePet, loadPet, validateSave, SAVE_KEY } from '../src/game/storage.js';
import { submitDaily, basicCare, updateStored } from '../src/game/daily.js';
import { refreshGrowth } from '../src/game/rules.js';
import { DAY_MS, koreanDate } from '../src/game/time.js';
const now=Date.parse('2026-10-19T12:00:00Z');
function quiz(pet=defaultPet(now),action='hunger',id='q'){return {pet,quiz:{action,answered:false,question:{instanceId:id,correctAnswer:'4',options:['4','5','6','7']}}};}
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
function napping(){return submitDaily(quiz({...defaultPet(now),hunger:90}),'4',now).pet;}
it('starts one ten-minute nap only when a feeding reward reaches 100',()=>{
  const pet=napping();
  expect(pet.hunger).toBe(100);expect(pet.totalXp).toBe(10);
  expect(pet.sleep).toEqual({startedAt:new Date(now).toISOString(),endsAt:new Date(now+NAP_MS).toISOString()});
  expect(sleepStatus(pet,now)).toEqual({sleeping:true,remainingMs:NAP_MS});
  expect(sleepStatus(pet,now+NAP_MS-1).sleeping).toBe(true);
  expect(sleepStatus(pet,now+NAP_MS).sleeping).toBe(false);
});
it('does not start for wrong answers, other actions or a feeding reward below 100',()=>{
  for(const [hunger,action,answer] of [[70,'hunger','4'],[90,'hunger','5'],[90,'cleanliness','4'],[90,'affection','4']]){
    expect(submitDaily(quiz({...defaultPet(now),hunger},action),answer,now).pet.sleep.endsAt).toBeNull();
  }
});
it('does not extend sleep or reject a feeding question already open when another tab starts a nap',()=>{
  const pet=napping();
  const result=submitDaily(quiz(pet,'hunger','already-open'),'4',now+1000);
  expect(result.quiz.answered).toBe(true);expect(result.pet.totalXp).toBe(20);
  expect(result.pet.sleep).toEqual(pet.sleep);
  expect(startNap({...pet,hunger:90},pet,'hunger',true,now+1000).sleep).toEqual(pet.sleep);
});
it('allows cleaning, play and basic care during sleep without changing its end time',()=>{
  const pet=napping();
  for(const action of ['cleanliness','affection']){
    const result=submitDaily(quiz(pet,action,action),'4',now+1000).pet;
    expect(result[action]).toBe(85);expect(result.sleep).toEqual(pet.sleep);
  }
  const cared=basicCare({pet,quiz:null},now+1000).pet;
  expect(cared.daily.careDone).toBe(true);expect(cared.sleep).toEqual(pet.sleep);
});
it('persists sleep across reload and wakes at the exact deadline with no automatic re-nap',async()=>{
  const pet=napping(),storage=memory();savePet(pet,storage,now);
  expect(loadPet(storage,now+1000).pet.sleep).toEqual(pet.sleep);
  const expired=loadPet(storage,now+NAP_MS);
  expect(expired.error).toBe('');expect(expired.migrated).toBe(true);
  expect(expired.pet.sleep.endsAt).toBeNull();
  await updateStored({pet,quiz:null},refreshGrowth,{storage,locks:null,now:now+NAP_MS});
  const saved=JSON.parse(storage.getItem(SAVE_KEY));expect(saved.sleep.endsAt).toBeNull();
  expect(saved.hunger).toBe(100);
  expect(refreshGrowth({pet:saved,quiz:null},now+NAP_MS+1000).pet.sleep.endsAt).toBeNull();
});
it('keeps illness and nursing independent from sleeping and waking',()=>{
  const pet={...defaultPet(now),level:2,hunger:90,lastCareAt:new Date(now-DAY_MS-1).toISOString()};
  const sickNap=submitDaily(quiz(pet),'4',now).pet;
  expect(sickNap.health.sickSince).toBeTruthy();expect(sleepStatus(sickNap,now).sleeping).toBe(true);
  const nursed=basicCare({pet:sickNap,quiz:null},now+1000).pet;
  expect(nursed.health.recoveryStartedAt).toBe(new Date(now+1000).toISOString());
  expect(nursed.sleep).toEqual(sickNap.sleep);
  const awake=refreshGrowth({pet:nursed,quiz:null},now+NAP_MS).pet;
  expect(awake.sleep.endsAt).toBeNull();expect(awake.health.recoveryStartedAt).toBe(nursed.health.recoveryStartedAt);
});
it('does not pause growth elapsed time while sleeping',()=>{
  const pet=napping();pet.totalXp=100;
  pet.growth.startedAt=new Date(now-2*DAY_MS+1000).toISOString();
  pet.growth.enteredAt=pet.growth.startedAt;
  pet.growth.careDates[1]=[koreanDate(now-DAY_MS),koreanDate(now)];
  const grown=refreshGrowth({pet,quiz:null},now+1000).pet;
  expect(grown.level).toBe(2);expect(grown.sleep).toEqual(pet.sleep);
});
it('migrates missing sleep data without resetting health, growth, XP or existing care times',()=>{
  const old={...defaultPet(now),totalXp:80,level:2};delete old.sleep;
  const migrated=validateSave(old,now+1000);
  expect(migrated.health).toEqual(old.health);expect(migrated.growth).toEqual(old.growth);
  expect(migrated.lastCareAt).toBe(old.lastCareAt);expect(migrated.totalXp).toBe(80);
  expect(migrated.sleep.endsAt).toBeNull();
});
it('repairs invalid or future sleep records without resetting the pet',()=>{
  for(const sleep of [{startedAt:'bad',endsAt:'bad'},{startedAt:new Date(now+1000).toISOString(),endsAt:new Date(now+1000+NAP_MS).toISOString()},{startedAt:new Date(now).toISOString(),endsAt:new Date(now+NAP_MS*2).toISOString()}]){
    const pet={...defaultPet(now),totalXp:40,sleep};
    const result=loadPet({getItem:()=>JSON.stringify(pet)},now);
    expect(result.error).toBeTruthy();expect(result.pet.totalXp).toBe(40);expect(result.pet.sleep.endsAt).toBeNull();
  }
});
it('rests only new feeding actions and makes them available at the exact wake time',()=>{
  const pet=napping();
  expect(isActionResting(pet,'hunger',now)).toBe(true);
  for(const action of ['cleanliness','affection'])expect(isActionResting(pet,action,now)).toBe(false);
  expect(isActionResting(pet,'hunger',now+NAP_MS)).toBe(false);
});
it('can nap after another explicit feeding answer while full and awake, never from a passive visit',()=>{
  const pet=napping(),awake=refreshGrowth({pet,quiz:null},now+NAP_MS).pet;
  expect(awake.hunger).toBe(100);expect(awake.sleep.endsAt).toBeNull();
  const next=submitDaily(quiz(awake,'hunger','next-feeding'),'4',now+NAP_MS).pet;
  expect(next.sleep.startedAt).toBe(new Date(now+NAP_MS).toISOString());
  expect(next.sleep.endsAt).toBe(new Date(now+NAP_MS*2).toISOString());
});
it('does not pause illness detection or recovery deadlines while asleep',()=>{
  const pet={...napping(),level:2};
  pet.lastCareAt=new Date(now-DAY_MS+1000).toISOString();
  const sick=refreshGrowth({pet,quiz:null},now+1001).pet;
  expect(sick.health.sickSince).toBeTruthy();expect(sleepStatus(sick,now+1001).sleeping).toBe(true);
  pet.health={sickSince:new Date(now-2*DAY_MS).toISOString(),recoveryStartedAt:new Date(now-DAY_MS+1000).toISOString(),followUpAt:new Date(now-1000).toISOString()};
  const healed=refreshGrowth({pet,quiz:null},now+1000).pet;
  expect(healed.health.sickSince).toBeNull();expect(healed.sleep).toEqual(pet.sleep);
});
it('locks duplicate feeding submissions without extending sleep or adding rewards',()=>{
  const first=submitDaily(quiz({...defaultPet(now),hunger:90}),'4',now);
  expect(submitDaily(first,'4',now+1000)).toBe(first);
  expect(first.pet.sleep.endsAt).toBe(new Date(now+NAP_MS).toISOString());
  expect(first.pet.totalXp).toBe(10);expect(first.pet.daily.count).toBe(1);
});
