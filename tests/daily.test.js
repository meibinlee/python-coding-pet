import { it, expect } from 'vitest';
import { submitDaily, submitStored } from '../src/game/daily.js';
import { defaultPet, loadPet, savePet } from '../src/game/storage.js';
const now = Date.parse('2026-10-19T14:59:59.999Z');
function state(pet=defaultPet(now), id='q1') {
  return {pet,quiz:{question:{instanceId:id,correctAnswer:'4',options:['4','5','6','7']},action:'hunger',answered:false}};
}
function memory() {const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
it('counts wrong answers, locks re-clicks and rejects invalid options',()=>{
  const s=state();expect(submitDaily(s,'bad',now)).toBe(s);
  const wrong=submitDaily(s,'5',now);
  expect(wrong.pet.totalXp).toBe(0);expect(wrong.pet.daily.count).toBe(1);
  expect(submitDaily(wrong,'4',now)).toBe(wrong);
  expect(submitDaily(state(wrong.pet),'4',now).pet.daily.count).toBe(1);
});
it('accepts the tenth answer and blocks the eleventh',()=>{
  let pet=defaultPet(now);
  // Play answers: feeding would stop after two meals because the pet becomes full.
  for(let i=0;i<10;i++)pet=submitDaily({...state(pet,`q${i}`),quiz:{...state(pet,`q${i}`).quiz,action:'affection'}},'4',now).pet;
  expect(pet.daily.count).toBe(10);expect(pet.totalXp).toBe(100);
  const last=state(pet,'eleven');expect(submitDaily(last,'4',now)).toBe(last);
});
it('charges an already open question to its submission date',()=>{
  const s=state();const answer=submitDaily(s,'4',now+1);
  expect(answer.pet.daily).toMatchObject({date:'2026-10-20',count:1});
});
it('reads latest saved progress before applying a stale tab answer',async()=>{
  const storage=memory();savePet(defaultPet(),storage);
  const a=state(loadPet(storage).pet,'a'), b=state(loadPet(storage).pet,'b');
  await submitStored(a,'4',{storage,locks:null});
  const result=await submitStored(b,'4',{storage,locks:null});
  expect(result.state.pet.totalXp).toBe(20);expect(result.state.pet.daily.count).toBe(2);
  expect(loadPet(storage).pet.totalXp).toBe(20);
});
it('serializes simultaneous tab submissions with the same lock name',async()=>{
  const storage=memory();savePet(defaultPet(),storage);
  let queue=Promise.resolve();const names=[];
  const locks={request(name,fn){names.push(name);const result=queue.then(fn);queue=result;return result;}};
  await Promise.all([submitStored(state(loadPet(storage).pet,'a'),'4',{storage,locks}),submitStored(state(loadPet(storage).pet,'b'),'4',{storage,locks})]);
  expect(new Set(names).size).toBe(1);expect(loadPet(storage).pet.daily.count).toBe(2);
  expect(loadPet(storage).pet.totalXp).toBe(20);
});
it('continues in memory when storage is unavailable',async()=>{
  const storage={getItem(){throw Error();},setItem(){throw Error();}};
  const result=await submitStored(state(),'4',{storage,locks:null,now});
  expect(result.saved).toBe(false);expect(result.state.pet.daily.count).toBe(1);
});
it('allows basic care after ten wrong answers without XP or stat changes',async()=>{
  const {basicCare}=await import('../src/game/daily.js');
  let pet=defaultPet(now);
  for(let i=0;i<10;i++)pet=submitDaily(state(pet,`wrong-${i}`),'5',now).pet;
  const s=state(pet);const cared=basicCare(s,now);
  expect(cared.pet).toMatchObject({totalXp:0,hunger:70,cleanliness:70,affection:70,daily:{count:10,careDone:true,careActions:[]}});
  expect(basicCare(cared,now)).toBe(cared);
  expect(basicCare(cared,now+1).pet.daily).toMatchObject({date:'2026-10-20',count:0,careDone:true});
});
it('only correct care records a checklist action and care timestamp',()=>{
  const before=now-1000,s=state(defaultPet(before));
  expect(submitDaily(s,'5',now).pet.lastCareAt).toBe(s.pet.lastCareAt);
  const right=submitDaily(s,'4',now);
  expect(right.pet.lastCareAt).toBe(new Date(now).toISOString());
  expect(right.pet.daily.careActions).toEqual(['hunger']);
});
it('retains unsaved wrong-answer counts when subsequent reads still work',async()=>{
  const storage=memory();savePet(defaultPet(now),storage);
  storage.setItem=()=>{throw Error('full');};
  const first=await submitStored(state(defaultPet(now),'first'),'5',{storage,locks:null,now});
  expect(first.saved).toBe(false);
  const second=await submitStored(state(first.state.pet,'second'),'5',{storage,locks:null,now,preferMemory:true});
  expect(second.state.pet.daily.count).toBe(2);expect(second.state.pet.totalXp).toBe(0);
});
it('serializes simultaneous answers at the daily limit',async()=>{
  const storage=memory();let pet=defaultPet(now);
  for(let i=0;i<9;i++)pet=submitDaily(state(pet,`old-${i}`),'5',now).pet;
  savePet(pet,storage);
  let queue=Promise.resolve();const locks={request(name,fn){const result=queue.then(fn);queue=result;return result;}};
  const results=await Promise.all(['a','b'].map(id=>submitStored(state(pet,id),'4',{storage,locks,now})));
  expect(results.filter(r=>r.blocked)).toHaveLength(1);
  expect(loadPet(storage,now).pet).toMatchObject({totalXp:10,daily:{count:10}});
});
it('records independent care without erasing another tab answer',async()=>{
  const {basicCare,updateStored}=await import('../src/game/daily.js');
  const storage=memory();const initial=state(defaultPet(now));savePet(initial.pet,storage);
  await submitStored(state(initial.pet,'other-tab'),'4',{storage,locks:null,now});
  await updateStored(initial,basicCare,{storage,locks:null,now});
  expect(loadPet(storage,now).pet).toMatchObject({totalXp:10,daily:{count:1,careDone:true,careActions:['hunger']}});
});
