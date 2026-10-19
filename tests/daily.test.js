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
  for(let i=0;i<10;i++)pet=submitDaily(state(pet,`q${i}`),'4',now).pet;
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
