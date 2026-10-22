import { it, expect } from 'vitest';
import { defaultPet, loadPet, savePet, SAVE_KEY } from '../src/game/storage.js';
import { setVacation, submitDaily, basicCare, updateStored, submitStored } from '../src/game/daily.js';
import { growthStatus, refreshGrowth, answerQuiz } from '../src/game/rules.js';
import { refreshHealth, healthStatus } from '../src/game/health.js';
import { isOnVacation } from '../src/game/vacation.js';
import { NAP_MS } from '../src/game/sleep.js';
import { DAY_MS, koreanDate, currentDaily } from '../src/game/time.js';
const start=Date.parse('2026-10-19T12:00:00Z');
const state=pet=>({pet:pet??defaultPet(start),quiz:null});
function baby(){return {...defaultPet(start),level:2,totalXp:170};}
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
function question(pet){return {pet,quiz:{action:'hunger',answered:false,question:{instanceId:'q',correctAnswer:'4',options:['4','5','6','7']}}};}
it('freezes growth remaining time without adding care dates and resumes at the exact remaining duration',()=>{
  const pet={...defaultPet(start),totalXp:100};pet.growth.careDates[1]=[koreanDate(start),koreanDate(start+DAY_MS)];
  const paused=setVacation(state(pet),true,start+DAY_MS);
  expect(growthStatus(paused.pet,start+5*DAY_MS).remainingMs).toBe(DAY_MS);
  expect(refreshGrowth(paused,start+10*DAY_MS).pet.level).toBe(1);
  const resumed=setVacation(paused,false,start+11*DAY_MS);
  expect(resumed.pet.growth.pausedMs).toBe(10*DAY_MS);
  expect(resumed.pet.growth.careDates).toEqual(pet.growth.careDates);
  expect(refreshGrowth(resumed,start+12*DAY_MS-1).pet.level).toBe(1);
  const grown=refreshGrowth(resumed,start+12*DAY_MS).pet;
  expect(grown.level).toBe(2);expect(grown.growth.pausedMs).toBe(0);
});
it('freezes healthy care time, including the exact 24-hour boundary',()=>{
  const half=DAY_MS/2, paused=setVacation(state(baby()),true,start+half);
  expect(healthStatus(paused.pet,start+20*DAY_MS).sick).toBe(false);
  const resumed=setVacation(paused,false,start+10*DAY_MS+half);
  expect(refreshHealth(resumed.pet,start+11*DAY_MS).health.sickSince).toBeNull();
  expect(refreshHealth(resumed.pet,start+11*DAY_MS+1).health.sickSince).toBeTruthy();
});
it('detects existing illness before entering vacation and does not heal it by waiting',()=>{
  const paused=setVacation(state(baby()),true,start+DAY_MS+1);
  expect(paused.pet.health.sickSince).toBeTruthy();
  const resumed=setVacation(paused,false,start+30*DAY_MS);
  expect(resumed.pet.health.sickSince).toBe(paused.pet.health.sickSince);
  expect(resumed.pet.health.recoveryStartedAt).toBeNull();
});
it('freezes active recovery even with an already recorded follow-up',()=>{
  const first=start+DAY_MS+1;
  let pet=basicCare(state(baby()),first).pet;
  pet=basicCare(state(pet),first+3*60*60*1000).pet;
  expect(pet.health.followUpAt).toBeTruthy();
  const paused=setVacation(state(pet),true,first+DAY_MS/2);
  expect(healthStatus(paused.pet,first+10*DAY_MS).remainingMs).toBe(DAY_MS/2);
  const resumed=setVacation(paused,false,first+10*DAY_MS+DAY_MS/2);
  expect(resumed.pet.health.sickSince).toBeTruthy();
  expect(refreshGrowth(resumed,first+11*DAY_MS-1).pet.health.sickSince).toBeTruthy();
  const healed=refreshGrowth(resumed,first+11*DAY_MS).pet;
  expect(healed.health.sickSince).toBeNull();expect(healed.health.recoveryPausedMs).toBe(0);
});
it('still requires another date’s nursing after a vacation when no follow-up was recorded',()=>{
  const first=start+DAY_MS+1,pet=basicCare(state(baby()),first).pet;
  const paused=setVacation(state(pet),true,first+1000);
  const resumed=setVacation(paused,false,first+10*DAY_MS+1000);
  expect(refreshGrowth(resumed,first+11*DAY_MS).pet.health.sickSince).toBeTruthy();
  expect(basicCare(resumed,first+11*DAY_MS).pet.health.sickSince).toBeNull();
});
it('blocks correct and wrong submissions, normal care and nursing without consuming counts or XP',()=>{
  const paused=setVacation(state(baby()),true,start+DAY_MS+1);
  const open=question(paused.pet);
  expect(submitDaily(open,'4',start+2*DAY_MS)).toBe(open);
  expect(submitDaily(open,'5',start+2*DAY_MS)).toBe(open);
  expect(answerQuiz(open,'4')).toBe(open);
  expect(basicCare(paused,start+2*DAY_MS)).toBe(paused);
  expect(healthStatus(paused.pet,start+2*DAY_MS).canCare).toBe(false);
  expect(paused.pet.totalXp).toBe(152);
});
it('keeps daily limits on real Korean dates with no saved-up unused questions',()=>{
  const pet=baby();pet.daily={...pet.daily,count:10,submittedIds:Array.from({length:10},(_,i)=>`old-${i}`)};
  const paused=setVacation(state(pet),true,start);
  expect(currentDaily(paused.pet,start).count).toBe(10);
  expect(currentDaily(paused.pet,start+5*DAY_MS).count).toBe(0);
  const resumed=setVacation(paused,false,start+5*DAY_MS);
  const answered=submitDaily(question(resumed.pet),'4',start+5*DAY_MS);
  expect(answered.pet.daily.count).toBe(1);expect(answered.pet.totalXp).toBe(180);
});
it('adds repeated vacation durations once, with idempotent explicit start/end requests',()=>{
  const initial=state();const first=setVacation(initial,true,start);
  expect(setVacation(first,true,start+1000)).toBe(first);
  const off=setVacation(first,false,start+DAY_MS);
  expect(setVacation(off,false,start+2*DAY_MS)).toBe(off);
  const second=setVacation(off,true,start+2*DAY_MS);
  const resumed=setVacation(second,false,start+4*DAY_MS);
  expect(resumed.pet.growth.pausedMs).toBe(3*DAY_MS);
});
it('normal care resets only its own illness pause offset',()=>{
  const paused=setVacation(state(baby()),true,start+1000);
  const off=setVacation(paused,false,start+3*DAY_MS+1000);
  expect(off.pet.health.carePausedMs).toBe(3*DAY_MS);
  const cared=basicCare(off,start+3*DAY_MS+1000).pet;
  expect(cared.health.carePausedMs).toBe(0);expect(cared.growth.pausedMs).toBe(3*DAY_MS);
});
it('allows a real-time nap to expire during vacation without waking the paused growth clock',()=>{
  const fed=submitDaily(question({...defaultPet(start),hunger:90}),'4',start);
  const paused=setVacation(fed,true,start);
  const refreshed=refreshGrowth(paused,start+NAP_MS);
  expect(refreshed.pet.sleep.endsAt).toBeNull();expect(isOnVacation(refreshed.pet)).toBe(true);
  expect(growthStatus(refreshed.pet,start+DAY_MS).remainingMs).toBe(2*DAY_MS);
});
it('preserves active vacation and paused clocks through reloads, including old care dates',async()=>{
  const pet=defaultPet(start);pet.growth.careDates[1]=[koreanDate(start)];
  const paused=setVacation(state(pet),true,start+1000),storage=memory();savePet(paused.pet,storage,start+1000);
  const loaded=loadPet(storage,start+20*DAY_MS);
  expect(loaded.error).toBe('');expect(isOnVacation(loaded.pet)).toBe(true);
  const result=await updateStored(state(loaded.pet),(s,now)=>setVacation(s,false,now),{storage,locks:null,now:start+20*DAY_MS});
  const restored=loadPet(storage,start+20*DAY_MS).pet;
  expect(restored.growth.careDates[1]).toEqual([koreanDate(start)]);
  expect(restored.growth.pausedMs).toBe(20*DAY_MS-1000);
  expect(result.saved).toBe(true);
});
it('migrates pre-vacation saves without resetting clocks or warning about newly added fields',()=>{
  const pet=baby();delete pet.vacation;delete pet.growth.pausedMs;
  delete pet.health.carePausedMs;delete pet.health.recoveryPausedMs;
  const loaded=loadPet({getItem:()=>JSON.stringify(pet)},start);
  expect(loaded.error).toBe('');expect(loaded.migrated).toBe(true);
  expect(loaded.pet.growth.startedAt).toBe(pet.growth.startedAt);
  expect(loaded.pet.lastCareAt).toBe(pet.lastCareAt);expect(isOnVacation(loaded.pet)).toBe(false);
});
it('reconciles a stale open quiz against another tab’s active vacation',async()=>{
  const storage=memory(),pet=defaultPet(start);savePet(pet,storage,start);
  await updateStored(state(pet),(s,now)=>setVacation(s,true,now),{storage,locks:null,now:start});
  const result=await submitStored(question(pet),'4',{storage,locks:null,now:start+1000});
  expect(result.blocked).toBe(true);expect(result.state.pet.totalXp).toBe(0);
  expect(result.state.pet.daily.count).toBe(0);
});
it('repairs future vacations and invalid pause offsets without resetting the pet',()=>{
  const pet=baby();pet.vacation={startedAt:new Date(start+DAY_MS).toISOString()};
  pet.growth.pausedMs=-1;pet.health.carePausedMs=Infinity;
  const loaded=loadPet({getItem:()=>JSON.stringify(pet)},start);
  expect(loaded.error).toBeTruthy();expect(loaded.pet.totalXp).toBe(170);expect(loaded.pet.level).toBe(2);
  expect(isOnVacation(loaded.pet)).toBe(false);expect(loaded.pet.growth.pausedMs).toBe(0);
  expect(loaded.pet.health.carePausedMs).toBe(0);
});
it('serializes two tabs requesting the same vacation state without toggling twice',async()=>{
  const storage=memory(),pet=defaultPet(start);savePet(pet,storage,start);
  let queue=Promise.resolve();const locks={request(name,fn){const result=queue.then(fn);queue=result;return result;}};
  const begins=await Promise.all([0,1].map(i=>updateStored(state(pet),(s,now)=>setVacation(s,true,now),{storage,locks,now:start+i})));
  expect(begins.filter(r=>r.blocked)).toHaveLength(1);
  expect(loadPet(storage,start+1).pet.vacation.startedAt).toBe(new Date(start).toISOString());
  const active=loadPet(storage,start+DAY_MS).pet;
  const ends=await Promise.all([0,1].map(i=>updateStored(state(active),(s,now)=>setVacation(s,false,now),{storage,locks,now:start+DAY_MS+i})));
  expect(ends.filter(r=>r.blocked)).toHaveLength(1);
  expect(loadPet(storage,start+DAY_MS+1).pet.growth.pausedMs).toBe(DAY_MS);
});
it('retains a failed vacation save in memory and resumes without double-counting its pause',async()=>{
  const storage=memory(),pet=defaultPet(start);savePet(pet,storage,start);
  const write=storage.setItem;storage.setItem=()=>{throw Error('full');};
  const paused=await updateStored(state(pet),(s,now)=>setVacation(s,true,now),{storage,locks:null,now:start});
  expect(paused.saved).toBe(false);expect(isOnVacation(paused.state.pet)).toBe(true);
  storage.setItem=write;
  const resumed=await updateStored(paused.state,(s,now)=>setVacation(s,false,now),{storage,locks:null,now:start+DAY_MS,preferMemory:true});
  expect(resumed.saved).toBe(true);
  expect(loadPet(storage,start+DAY_MS).pet.growth.pausedMs).toBe(DAY_MS);
});
it('preserves recovery pause and the original nursing dates through a reload after resume',()=>{
  const first=start+DAY_MS+1,storage=memory();
  let pet=basicCare(state(baby()),first).pet;
  pet=basicCare(state(pet),first+3*60*60*1000).pet;
  const paused=setVacation(state(pet),true,first+DAY_MS/2);
  const resumed=setVacation(paused,false,first+10*DAY_MS+DAY_MS/2);
  savePet(resumed.pet,storage,first+10*DAY_MS+DAY_MS/2);
  const restored=loadPet(storage,first+10*DAY_MS+DAY_MS/2);
  expect(restored.error).toBe('');
  expect(restored.pet.health.recoveryStartedAt).toBe(pet.health.recoveryStartedAt);
  expect(restored.pet.health.followUpAt).toBe(pet.health.followUpAt);
  expect(restored.pet.health.recoveryPausedMs).toBe(10*DAY_MS);
  expect(healthStatus(restored.pet,first+10*DAY_MS+DAY_MS/2).remainingMs).toBe(DAY_MS/2);
});
it('a correct answer after vacation starts a fresh care clock without discarding growth pause time',()=>{
  const paused=setVacation(state(baby()),true,start+1000);
  const off=setVacation(paused,false,start+3*DAY_MS+1000);
  const answer=submitDaily(question(off.pet),'4',start+3*DAY_MS+1000).pet;
  expect(answer.health.carePausedMs).toBe(0);expect(answer.growth.pausedMs).toBe(3*DAY_MS);
  expect(refreshHealth(answer,start+4*DAY_MS+1000).health.sickSince).toBeNull();
  expect(refreshHealth(answer,start+4*DAY_MS+1001).health.sickSince).toBeTruthy();
});
