import { it, expect } from 'vitest';
import { CARE_INTERVAL_MS as H, refreshMaintenance, maintenanceRemaining, newMaintenance } from '../src/game/maintenance.js';
import { defaultPet, loadPet, savePet, SAVE_KEY } from '../src/game/storage.js';
import { refreshGrowth } from '../src/game/rules.js';
import { submitDaily, basicCare, setVacation, updateStored } from '../src/game/daily.js';
const start = Date.parse('2026-10-22T00:00:00Z');
const pet = () => ({ ...defaultPet(start), totalXp: 100 });
const state = p => ({ pet: p, quiz: null });
const quiz = (p,action='hunger',id='q') => ({pet:p,quiz:{action,answered:false,question:{instanceId:id,correctAnswer:'4',options:['4','5','6','7']}}});
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
it('charges each missing action at exactly four hours and preserves fractional intervals',()=>{
  const p=pet();expect(refreshMaintenance(p,start+H-1)).toBe(p);
  const first=refreshMaintenance(p,start+H);expect(first.totalXp).toBe(97);
  expect(refreshMaintenance(first,start+H)).toBe(first);
  const later=refreshMaintenance(first,start+2*H+1234);expect(later.totalXp).toBe(94);
  expect(maintenanceRemaining(later,'hunger',start+2*H+1234)).toBe(H-1234);
});
it('settles an offline absence once, including reloads and stale tabs',async()=>{
  const storage=memory(),p=pet(),now=start+3*H+1000;savePet(p,storage,start);
  const first=await updateStored(state(p),refreshGrowth,{storage,locks:null,now});
  expect(first.state.pet.totalXp).toBe(91);
  const stale=await updateStored(state(p),refreshGrowth,{storage,locks:null,now});
  expect(stale.state.pet.totalXp).toBe(91);expect(loadPet(storage,now).pet.totalXp).toBe(91);
});
it('resets only the correctly completed action after settling past intervals',()=>{
  const result=submitDaily(quiz(pet()),'4',start+H+1000);
  expect(result.pet.totalXp).toBe(107);
  expect(result.pet.maintenance.hunger).toBe(start+H+1000);
  expect(result.pet.maintenance.cleanliness).toBe(start+H);
  expect(submitDaily(result,'4',start+H+2000)).toBe(result);
  expect(refreshMaintenance(result.pet,start+2*H).totalXp).toBe(105);
});
it('wrong answers and basic care do not reset action clocks',()=>{
  const wrong=submitDaily(quiz(pet()),'5',start+H);expect(wrong.pet.totalXp).toBe(92);
  expect(wrong.pet.maintenance).toEqual(newMaintenance(start+H));
  const cared=basicCare(state(pet()),start+H+1000).pet;
  expect(cared.totalXp).toBe(97);expect(cared.maintenance).toEqual(newMaintenance(start+H));
});
it('does not exempt naps or illness, and never reduces an earned level',()=>{
  const p={...pet(),level:2,sleep:{startedAt:new Date(start).toISOString(),endsAt:new Date(start+100000).toISOString()}};
  const result=refreshGrowth(state(p),start+10*H).pet;
  expect(result.totalXp).toBe(70);expect(result.level).toBe(2);expect(result.health.sickSince).toBeTruthy();
});
it('advances accounting at zero XP so later rewards are not charged again',()=>{
  const p=refreshMaintenance({...pet(),totalXp:1},start+100*H);
  expect(p.totalXp).toBe(0);expect(p.maintenance).toEqual(newMaintenance(start+100*H));
  const rewarded=submitDaily(quiz(p),'4',start+100*H).pet;
  expect(refreshMaintenance(rewarded,start+100*H)).toBe(rewarded);expect(rewarded.totalXp).toBe(10);
});
it('freezes all three maintenance clocks on vacation and resumes the exact remaining time',()=>{
  const paused=setVacation(state(pet()),true,start+H/2);
  expect(refreshMaintenance(paused.pet,start+100*H)).toBe(paused.pet);
  expect(maintenanceRemaining(paused.pet,'hunger',start+100*H)).toBe(H/2);
  const resumed=setVacation(paused,false,start+10*H+H/2);
  expect(resumed.pet.totalXp).toBe(100);
  expect(refreshMaintenance(resumed.pet,start+11*H-1)).toBe(resumed.pet);
  expect(refreshMaintenance(resumed.pet,start+11*H).totalXp).toBe(97);
});
it('settles overdue time before vacation and prevents duplicate resume charges',()=>{
  const paused=setVacation(state(pet()),true,start+H);
  expect(paused.pet.totalXp).toBe(97);
  const resumed=setVacation(paused,false,start+5*H);
  expect(resumed.pet.totalXp).toBe(97);expect(setVacation(resumed,false,start+6*H)).toBe(resumed);
});
it('ends periodic decay at adulthood while retaining wrong-answer penalties',()=>{
  const adult={...pet(),level:3};expect(refreshMaintenance(adult,start+100*H)).toBe(adult);
  expect(submitDaily(quiz(adult),'5',start+100*H).pet.totalXp).toBe(95);
});
it('checks maintenance loss before allowing growth at the XP boundary',()=>{
  const p={...pet(),totalXp:50};p.growth.careDates[1]=['2026-10-22','2026-10-23'];
  const result=refreshGrowth(state(p),start+48*3600000).pet;
  expect(result.level).toBe(1);expect(result.totalXp).toBe(14);
});
it('starts old saves at migration time without retroactive penalties',()=>{
  const storage=memory(),p=pet();delete p.maintenance;storage.setItem(SAVE_KEY,JSON.stringify(p));
  const now=start+100*H,loaded=loadPet(storage,now);
  expect(loaded.migrated).toBe(true);expect(loaded.pet.totalXp).toBe(100);
  expect(loaded.pet.maintenance).toEqual(newMaintenance(now));
  expect(refreshGrowth(state(loaded.pet),now).pet.totalXp).toBe(100);
});
it('migrates old saves during vacation without creating future anchors on resume',()=>{
  const storage=memory(),p={...pet(),vacation:{startedAt:new Date(start).toISOString()}};delete p.maintenance;
  storage.setItem(SAVE_KEY,JSON.stringify(p));
  const now=start+10*H,loaded=loadPet(storage,now);
  const resumed=setVacation(state(loaded.pet),false,now);
  expect(resumed.pet.maintenance).toEqual(newMaintenance(now));expect(resumed.pet.totalXp).toBe(100);
});
it('repairs invalid or future action clocks while preserving valid records and XP',()=>{
  const storage=memory(),p=pet();p.maintenance={hunger:start,cleanliness:'bad',affection:start+100*H};
  storage.setItem(SAVE_KEY,JSON.stringify(p));const now=start+H/2,loaded=loadPet(storage,now);
  expect(loaded.error).toBeTruthy();expect(loaded.pet.totalXp).toBe(100);
  expect(loaded.pet.maintenance).toEqual({hunger:start,cleanliness:now,affection:now});
});
it('preserves settled clocks when saving falls back to memory',async()=>{
  const storage={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}};
  const first=await updateStored(state(pet()),refreshGrowth,{storage,locks:null,now:start+H,preferMemory:true});
  expect(first.saved).toBe(false);expect(first.state.pet.totalXp).toBe(97);
  const again=await updateStored(first.state,refreshGrowth,{storage,locks:null,now:start+H,preferMemory:true});
  expect(again.state.pet.totalXp).toBe(97);
});
