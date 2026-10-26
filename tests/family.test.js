import { it, expect } from 'vitest';
import { graduationStatus, graduate, remainingCharacters, isFamily, familyPets, familyCanCare, updateMember, GRADUATE_WAIT_MS } from '../src/game/family.js';
import { createPet, loadPet, savePet, SAVE_KEY } from '../src/game/storage.js';
import { submitDaily, basicCare, setVacation } from '../src/game/daily.js';
import { refreshGrowth } from '../src/game/rules.js';
import { recordStudy } from '../src/game/streak.js';
import { recordMeal } from '../src/game/meal.js';
import { buyItem } from '../src/game/shop.js';
import { DAY_MS, koreanDate } from '../src/game/time.js';
const start=Date.parse('2026-10-26T03:00:00Z');
const HOUR=60*60*1000;
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
function adult(character='chiikawa',time=start,extra={}){
  const pet=createPet(character,character,time);
  return {...pet,level:3,totalXp:200,hunger:80,cleanliness:80,affection:80,growth:{...pet.growth,enteredAt:new Date(time).toISOString()},...extra};
}
const ready=start+GRADUATE_WAIT_MS;
function quiz(pet,action='affection',id='q'){return {pet,quiz:{action,answered:false,question:{instanceId:id,options:['4','5','6','7'],correctAnswer:'4'}}};}
// Raises the first two characters and returns the third as an egg with the right growth state.
function secondGeneration(){
  const first=graduate({pet:adult('chiikawa'),quiz:null},createPet('하치','hachiware',ready),ready).pet;
  return first;
}
function family(time=start+20*DAY_MS){
  const graduates=[adult('chiikawa',start,{graduatedAt:new Date(start).toISOString(),vacation:{startedAt:new Date(start).toISOString()}}),adult('hachiware',start,{graduatedAt:new Date(start).toISOString(),vacation:{startedAt:new Date(start).toISOString()}})];
  const baby={...createPet('우사','usagi',time-5*DAY_MS),level:2,totalXp:150,graduates};
  const grownTime=time;
  baby.growth={...baby.growth,enteredAt:new Date(time-5*DAY_MS).toISOString(),careDates:{1:[],2:['2026-11-01','2026-11-02','2026-11-03','2026-11-04'],3:[]}};
  baby.needs={hunger:grownTime,cleanliness:grownTime,affection:grownTime};baby.maintenance={hunger:grownTime,cleanliness:grownTime,affection:grownTime};
  return refreshGrowth({pet:baby,quiz:null},grownTime).pet;
}

it('an adult may graduate after 3 days while healthy and not on vacation',()=>{
  const pet=adult();
  expect(graduationStatus(pet,ready-1)).toMatchObject({available:true,ready:false,remainingMs:1});
  expect(graduationStatus(pet,ready).ready).toBe(true);
  expect(graduationStatus({...pet,level:2},ready).available).toBe(false);
  expect(graduationStatus({...pet,health:{...pet.health,sickSince:new Date(start).toISOString()}},ready).ready).toBe(false);
  expect(graduationStatus({...pet,vacation:{startedAt:new Date(start+DAY_MS).toISOString()}},ready).ready).toBe(false);
});
it('graduation rests the adult and starts another character as a new egg with its own XP and wardrobe',()=>{
  const streak=recordStudy({count:0,best:0,lastDate:null,rewards:['sprout']},ready);
  const pet={...adult('chiikawa',start,{streak,wardrobe:{owned:['crown','sprout'],equipped:{clothes:null,headband:'crown'}}}),daily:{date:koreanDate(ready),period:7,count:4,submittedIds:['a','b','c','d'],careDone:true,nursingDone:false,careActions:['hunger']}};
  const state={pet,quiz:null};
  expect(graduate(state,createPet('x','chiikawa',ready),ready)).toBe(state);
  expect(graduate(state,createPet('x','usagi',ready),ready-1)).toBe(state);
  const next=graduate(state,createPet('우사','usagi',ready),ready).pet;
  expect(next).toMatchObject({characterId:'usagi',petName:'우사',level:1,totalXp:0});
  expect(next.daily.count).toBe(4);expect(next.streak).toBe(streak);
  expect(next.wardrobe).toEqual({owned:['sprout'],equipped:{clothes:null,headband:null}});
  expect(next.graduates).toHaveLength(1);
  expect(next.graduates[0]).toMatchObject({characterId:'chiikawa',totalXp:200,graduatedAt:new Date(ready).toISOString(),vacation:{startedAt:new Date(ready).toISOString()}});
  expect(next.graduates[0].wardrobe.equipped.headband).toBe('crown');
  expect(remainingCharacters(next).map(c=>c.id)).toEqual(['hachiware']);
  expect(isFamily(next)).toBe(false);expect(familyPets(next)).toEqual([next]);
});
it('resting graduates do not change while the next egg is raised',()=>{
  const pet=secondGeneration();
  const later=refreshGrowth({pet,quiz:null},ready+10*DAY_MS).pet;
  expect(later.graduates[0]).toBe(pet.graduates[0]);
  expect(later.hunger).toBeLessThan(pet.hunger);
});
it('the family reunites when the last egg grows up and the graduates continue from their paused time',()=>{
  const time=start+20*DAY_MS,pet=family(time);
  expect(pet.level).toBe(3);expect(pet.familyAt).toBe(new Date(time).toISOString());
  expect(pet.graduates.every(g=>!g.vacation.startedAt)).toBe(true);
  expect(pet.graduates[0].hunger).toBe(80);
  const later=refreshGrowth({pet,quiz:null},time+2*HOUR).pet;
  expect(later.graduates.map(g=>g.hunger)).toEqual([78,78]);
  expect(graduationStatus(later,time+10*DAY_MS).available).toBe(false);
});
it('one answer cares for the whole family and each pet keeps its own XP',()=>{
  const pet=family();
  const right=submitDaily(quiz(pet),'4',start+20*DAY_MS).pet;
  expect(familyPets(right).map(m=>m.affection)).toEqual([pet.affection+15,95,95]);
  expect(familyPets(right).map(m=>m.totalXp)).toEqual([160,210,210]);
  expect(right.daily.count).toBe(1);
  const wrong=submitDaily(quiz(pet,'affection','w'),'5',start+20*DAY_MS).pet;
  expect(familyPets(wrong).map(m=>m.totalXp)).toEqual([145,195,195]);
  expect(wrong.graduates[0].affection).toBe(80);
});
it('a full pet skips the meal while the others eat, and everyone full blocks feeding',()=>{
  const time=start+20*DAY_MS,pet=family(time);
  const full=p=>recordMeal(recordMeal(p,time),time);
  const one={...full(pet),graduates:pet.graduates};
  const fed=submitDaily(quiz(one,'hunger'),'4',time).pet;
  expect(fed.hunger).toBe(one.hunger);expect(fed.totalXp).toBe(one.totalXp+10);
  expect(fed.graduates.map(g=>g.hunger)).toEqual([95,95]);
  const all={...full(pet),graduates:pet.graduates.map(full)};
  const state=quiz(all,'hunger');
  expect(submitDaily(state,'4',time)).toBe(state);
});
it('family nursing covers a sick graduate, even after today’s basic care',()=>{
  const time=start+20*DAY_MS,pet=family(time);
  const cared=basicCare({pet,quiz:null},time).pet;
  expect(familyCanCare(cared,time)).toBe(false);
  const sick={...cared,graduates:[{...cared.graduates[0],affection:0},cared.graduates[1]]};
  const sickNow=refreshGrowth({pet:sick,quiz:null},time+1000).pet;
  expect(sickNow.graduates[0].health.sickSince).toBeTruthy();
  expect(familyCanCare(sickNow,time+1000)).toBe(true);
  const nursed=basicCare({pet:sickNow,quiz:null},time+2000).pet;
  expect(nursed.graduates[0].health.recoveryStartedAt).toBe(new Date(time+2000).toISOString());
  expect(nursed.daily.nursingDone).toBe(true);
  expect(familyCanCare(nursed,time+3000)).toBe(false);
});
it('the reunited family goes on vacation and comes back together',()=>{
  const time=start+20*DAY_MS,pet=family(time);
  const away=setVacation({pet,quiz:null},true,time).pet;
  expect(familyPets(away).every(m=>m.vacation.startedAt)).toBe(true);
  const back=setVacation({pet:away,quiz:null},false,time+5*DAY_MS).pet;
  expect(familyPets(back).every(m=>!m.vacation.startedAt)).toBe(true);
  expect(back.graduates.map(g=>g.hunger)).toEqual([80,80]);
});
it('the shop spends the chosen family member’s own XP',()=>{
  const pet=family();
  const state=updateMember({pet,quiz:null},2,current=>buyItem(current,'crown'));
  expect(state.pet.graduates[1].totalXp).toBe(120);expect(state.pet.graduates[1].wardrobe.owned).toEqual(['crown']);
  expect(state.pet.totalXp).toBe(pet.totalXp);expect(state.pet.graduates[0]).toBe(pet.graduates[0]);
  const resting={pet:secondGeneration(),quiz:null};
  expect(updateMember(resting,1,current=>buyItem(current,'crown'))).toBe(resting);
});
it('saves and reloads graduates and the family, and repairs invalid graduates',()=>{
  const storage=memory(),time=start+20*DAY_MS,pet=family(time);
  savePet(pet,storage,time);
  const loaded=loadPet(storage,time);
  expect(loaded.error).toBe('');expect(loaded.pet.familyAt).toBe(pet.familyAt);
  expect(loaded.pet.graduates.map(g=>g.characterId)).toEqual(['chiikawa','hachiware']);
  const resting=secondGeneration();savePet(resting,storage,ready);
  const restingLoaded=loadPet(storage,ready);
  expect(restingLoaded.error).toBe('');expect(restingLoaded.pet.graduates[0].vacation.startedAt).toBe(new Date(ready).toISOString());
  const duplicate={...resting,graduates:[...resting.graduates,{...resting.graduates[0]},{...resting.graduates[0],characterId:'hachiware',level:2}]};
  const fixed=loadPet({getItem:()=>JSON.stringify(duplicate)},ready);
  expect(fixed.error).toBeTruthy();expect(fixed.pet.graduates).toHaveLength(1);expect(fixed.pet.totalXp).toBe(0);
  const awake=loadPet({getItem:()=>JSON.stringify({...resting,graduates:[{...resting.graduates[0],vacation:{startedAt:null}}]})},ready+1000);
  expect(awake.error).toBeTruthy();expect(awake.pet.graduates[0].vacation.startedAt).toBe(new Date(ready+1000).toISOString());
  const early=loadPet({getItem:()=>JSON.stringify({...resting,familyAt:new Date(ready).toISOString()})},ready);
  expect(early.error).toBeTruthy();expect(early.pet.familyAt).toBeNull();
});
