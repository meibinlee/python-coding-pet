import { it, expect } from 'vitest';
import { applyRoomCare, isRoomMessy, refreshGrowth } from '../src/game/rules.js';
import { defaultPet, savePet, loadPet, validateSave, SAVE_KEY } from '../src/game/storage.js';
import { submitDaily, submitStored, basicCare, updateStored } from '../src/game/daily.js';
const now=Date.parse('2026-10-19T12:00:00Z');
function quiz(pet,action='hunger',id='q'){return {pet,quiz:{action,answered:false,question:{instanceId:id,correctAnswer:'4',options:['4','5','6','7']}}};}
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
function messy(){const first=submitDaily(quiz(defaultPet(now),'hunger','first'),'4',now);return submitDaily(quiz(first.pet,'hunger','second'),'4',now).pet;}
it('creates one bounded mess after two correct feedings without additional stat or XP penalties',()=>{
  const first=submitDaily(quiz(defaultPet(now)),'4',now).pet;
  expect(first.room.feedings).toBe(1);expect(isRoomMessy(first)).toBe(false);
  const second=submitDaily(quiz(first,'hunger','second'),'4',now).pet;
  expect(isRoomMessy(second)).toBe(true);
  expect(second).toMatchObject({hunger:100,cleanliness:70,affection:70,totalXp:20,daily:{count:2}});
  const third=submitDaily(quiz(second,'hunger','third'),'4',now).pet;
  expect(third.room.feedings).toBe(2);
});
it('leaves the room unchanged on wrong answers, invalid submissions and duplicate clicks',()=>{
  const initial=quiz(defaultPet(now)),wrong=submitDaily(initial,'5',now);
  expect(wrong.pet.room.feedings).toBe(0);
  expect(submitDaily(initial,'bad',now)).toBe(initial);
  const right=submitDaily(initial,'4',now);
  expect(submitDaily(right,'4',now)).toBe(right);
  expect(right.pet.room.feedings).toBe(1);
});
it('clears mess and the feeding count only on a correct cleaning answer',()=>{
  const pet=messy();
  expect(submitDaily(quiz(pet,'cleanliness'),'5',now).pet.room.feedings).toBe(2);
  const clean=submitDaily(quiz(pet,'cleanliness','clean'),'4',now).pet;
  expect(clean.room.feedings).toBe(0);expect(isRoomMessy(clean)).toBe(false);
  expect(clean.cleanliness).toBe(85);expect(clean.totalXp).toBe(30);
  const fed=submitDaily(quiz(clean,'hunger','fed-again'),'4',now).pet;
  expect(fed.room.feedings).toBe(1);expect(isRoomMessy(fed)).toBe(false);
});
it('does not remove mess on play, basic care or a passive visit',()=>{
  const pet=messy();
  expect(submitDaily(quiz(pet,'affection'),'4',now).pet.room.feedings).toBe(2);
  expect(basicCare({pet,quiz:null},now).pet.room.feedings).toBe(2);
  expect(refreshGrowth({pet,quiz:null},now).pet.room.feedings).toBe(2);
  expect(applyRoomCare(pet,'cleanliness',false)).toBe(pet);
});
it('keeps sleep and illness independent from cleaning a dirty room',()=>{
  const pet={...messy(),level:2,health:{sickSince:new Date(now-1000).toISOString(),recoveryStartedAt:null,followUpAt:null}};
  const cleaned=submitDaily(quiz(pet,'cleanliness','clean'),'4',now).pet;
  expect(cleaned.room.feedings).toBe(0);expect(cleaned.sleep).toEqual(pet.sleep);
  expect(cleaned.health.sickSince).toBe(pet.health.sickSince);
});
it('preserves partial feeding progress and mess across reloads',()=>{
  const storage=memory();
  for(const feedings of [1,2]){
    const pet={...defaultPet(now),room:{feedings}};savePet(pet,storage,now);
    expect(loadPet(storage,now+1000).pet.room.feedings).toBe(feedings);
  }
});
it('extends old saves without losing pet, health, growth or daily records',async()=>{
  const storage=memory(),old={...defaultPet(now),petName:'친구',level:2,totalXp:90};delete old.room;
  storage.setItem(SAVE_KEY,JSON.stringify(old));
  const loaded=loadPet(storage,now);
  expect(loaded.error).toBe('');expect(loaded.migrated).toBe(true);
  expect(loaded.pet).toMatchObject({petName:'친구',level:2,totalXp:90,room:{feedings:0}});
  expect(loaded.pet.growth).toEqual(old.growth);expect(loaded.pet.health).toEqual(old.health);
  expect(loaded.pet.lastCareAt).toBe(old.lastCareAt);
  await updateStored({pet:loaded.pet,quiz:null},refreshGrowth,{storage,locks:null,now});
  expect(JSON.parse(storage.getItem(SAVE_KEY)).room.feedings).toBe(0);
});
it('repairs malformed room counts without resetting the pet',()=>{
  for(const room of [null,{},[],{feedings:-1},{feedings:3},{feedings:1.5},{feedings:'2'}]){
    const pet={...defaultPet(now),totalXp:40,room};
    const loaded=loadPet({getItem:()=>JSON.stringify(pet)},now);
    expect(loaded.error).toBeTruthy();expect(loaded.pet.totalXp).toBe(40);expect(loaded.pet.room.feedings).toBe(0);
  }
  expect(validateSave({...defaultPet(now),room:{feedings:2}},now).room.feedings).toBe(2);
});
it('reconciles stale tabs so two feeding answers create a single mess and duplicate IDs do not count',async()=>{
  const storage=memory(),pet=defaultPet(now);savePet(pet,storage,now);
  let queue=Promise.resolve();const locks={request(name,fn){const result=queue.then(fn);queue=result;return result;}};
  await Promise.all(['a','b'].map(id=>submitStored(quiz(pet,'hunger',id),'4',{storage,locks,now})));
  expect(loadPet(storage,now).pet.room.feedings).toBe(2);
  await submitStored(quiz(pet,'hunger','a'),'4',{storage,locks,now});
  expect(loadPet(storage,now).pet.daily.count).toBe(2);
});
it('keeps an unsaved cleaning result in memory instead of restoring stale mess',async()=>{
  const storage=memory(),pet=messy();savePet(pet,storage,now);
  storage.setItem=()=>{throw Error('full');};
  const cleaned=await submitStored(quiz(pet,'cleanliness','clean'),'4',{storage,locks:null,now});
  expect(cleaned.saved).toBe(false);expect(cleaned.state.pet.room.feedings).toBe(0);
  const next=await submitStored(quiz(cleaned.state.pet,'affection','play'),'4',{storage,locks:null,now,preferMemory:true});
  expect(next.state.pet.room.feedings).toBe(0);
});
