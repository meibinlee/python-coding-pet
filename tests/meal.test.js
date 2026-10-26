import { it, expect } from 'vitest';
import { FULL_MS, MOOD_MS, isFull, fullRemaining, activeMood, normalizeMeal, normalizeMood } from '../src/game/meal.js';
import { isActionResting } from '../src/game/sleep.js';
import { submitDaily, updateStored } from '../src/game/daily.js';
import { refreshGrowth } from '../src/game/rules.js';
import { defaultPet, loadPet, savePet } from '../src/game/storage.js';
const now=Date.parse('2026-10-26T03:00:00Z');
const quiz=(pet,action='hunger',id='q')=>({pet,quiz:{action,answered:false,question:{instanceId:id,correctAnswer:'4',options:['4','5','6','7']}}});
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
const fedTwice=()=>submitDaily(quiz(submitDaily(quiz(defaultPet(now),'hunger','a'),'4',now).pet,'hunger','b'),'4',now+1000).pet;

it('becomes full after two correct meals and rests feeding for three hours',()=>{
  const once=submitDaily(quiz(defaultPet(now),'hunger','a'),'4',now).pet;
  expect(isFull(once,now)).toBe(false);expect(once.meal.feeds).toBe(1);
  const full=fedTwice();
  expect(isFull(full,now+1000)).toBe(true);expect(fullRemaining(full,now+1000)).toBe(FULL_MS);
  expect(isActionResting(full,'hunger',now+1000)).toBe(true);
  expect(isActionResting(full,'affection',now+1000)).toBe(false);
  expect(isFull(full,now+1000+FULL_MS)).toBe(false);
  expect(refreshGrowth({pet:full,quiz:null},now+1000+FULL_MS).pet.meal).toEqual({feeds:0,fullUntil:null});
});
it('wrong answers do not count as meals and a full pet cannot eat from an already open quiz',()=>{
  expect(submitDaily(quiz(defaultPet(now)),'5',now).pet.meal.feeds).toBe(0);
  const open=quiz(fedTwice(),'hunger','c');
  expect(submitDaily(open,'4',now+2000)).toBe(open);
});
it('keeps the cheerful or tidy look for a while after playing or cleaning',()=>{
  const played=submitDaily(quiz(defaultPet(now),'affection'),'4',now).pet;
  expect(activeMood(played,now+MOOD_MS-1)).toBe('play');expect(activeMood(played,now+MOOD_MS)).toBeNull();
  expect(activeMood(submitDaily(quiz(defaultPet(now),'cleanliness'),'4',now).pet,now)).toBe('clean');
  expect(activeMood(submitDaily(quiz(defaultPet(now),'affection'),'5',now).pet,now)).toBeNull();
});
it('saves meal and mood timers and repairs invalid ones',async()=>{
  const storage=memory(),pet=fedTwice();savePet(pet,storage,now+1000);
  expect(loadPet(storage,now+2000).pet.meal.fullUntil).toBe(pet.meal.fullUntil);
  expect(normalizeMeal({feeds:9,fullUntil:'x'},now)).toEqual({feeds:0,fullUntil:null});
  expect(normalizeMeal({fullUntil:new Date(now+FULL_MS+1).toISOString()},now).fullUntil).toBeNull();
  expect(normalizeMood({kind:'dance',until:new Date(now+1).toISOString()},now)).toEqual({kind:null,until:null});
  const stale=await updateStored(quiz(pet,'hunger','d'),(s,t)=>submitDaily(s,'4',t),{storage,locks:null,now:now+3000});
  expect(stale.blocked).toBe(true);
});
