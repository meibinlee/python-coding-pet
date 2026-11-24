import { it, expect } from 'vitest';
import { newActivity, normalizeActivity, recordSolve, recentSolves, rankingScore, petsRaised, RECENT_DAYS, DAY_SOLVE_LIMIT } from '../src/game/activity.js';
import { createPet, loadPet, savePet, SAVE_KEY } from '../src/game/storage.js';
import { submitDaily } from '../src/game/daily.js';
import { graduate, GRADUATE_WAIT_MS } from '../src/game/family.js';
import { toRanking } from '../src/game/cloud.js';
import { DAY_MS, koreanDate } from '../src/game/time.js';
const start=Date.parse('2026-11-24T03:00:00Z');
const day=n=>start+n*DAY_MS;
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
function quiz(pet,id='q'){return {pet,quiz:{action:'affection',answered:false,question:{instanceId:id,options:['4','5','6','7'],correctAnswer:'4'}}};}

it('counts correct answers per Korean date and keeps only the last 7 days',()=>{
  let activity=newActivity();
  activity=recordSolve(activity,start);activity=recordSolve(activity,start+1000);
  expect(activity).toEqual({[koreanDate(start)]:2});
  activity=recordSolve(activity,day(3));
  expect(recentSolves(activity,day(3))).toBe(3);
  expect(recentSolves(activity,day(RECENT_DAYS-1))).toBe(3);
  expect(recentSolves(activity,day(RECENT_DAYS))).toBe(1);
  expect(recordSolve(activity,day(RECENT_DAYS+3))).toEqual({[koreanDate(day(RECENT_DAYS+3))]:1});
});
it('repairs broken activity records and caps a day',()=>{
  const today=koreanDate(start);
  expect(normalizeActivity(null,start)).toEqual({});
  expect(normalizeActivity([1,2],start)).toEqual({});
  expect(normalizeActivity({[today]:1.5,'2026-13-1':3,'9999-01-01':4,[koreanDate(day(-1))]:-2,x:1},start)).toEqual({});
  expect(normalizeActivity({[today]:999},start)).toEqual({[today]:DAY_SOLVE_LIMIT});
  let capped={[today]:DAY_SOLVE_LIMIT};
  expect(recordSolve(capped,start)[today]).toBe(DAY_SOLVE_LIMIT);
});
it('records only correct answers when a quiz is submitted',()=>{
  const pet=createPet('a','usagi',start);
  const right=submitDaily(quiz(pet,'a'),'4',start);
  expect(right.pet.activity).toEqual({[koreanDate(start)]:1});
  const wrong=submitDaily(quiz(right.pet,'b'),'5',start+1000);
  expect(wrong.pet.activity).toEqual({[koreanDate(start)]:1});
});
it('loads old saves without activity and keeps activity across reloads',()=>{
  const storage=memory();
  const {activity,...old}=createPet('a','usagi',start);
  storage.setItem(SAVE_KEY,JSON.stringify(old));
  const loaded=loadPet(storage,start);
  expect(loaded.pet.activity).toEqual({});
  expect(loaded.error).toBe('');
  const played={...loaded.pet,activity:{[koreanDate(start)]:4}};
  savePet(played,storage,start);
  expect(loadPet(storage,start).pet.activity).toEqual({[koreanDate(start)]:4});
});
it('keeps recent answers with the player after graduation',()=>{
  const base=createPet('치이','chiikawa',start);
  const adult={...base,level:3,totalXp:200,hunger:80,cleanliness:80,affection:80,growth:{...base.growth,enteredAt:new Date(start).toISOString()},activity:{[koreanDate(start)]:5}};
  const ready=start+GRADUATE_WAIT_MS;
  const next=graduate({pet:adult,quiz:null},createPet('하치','hachiware',ready),ready).pet;
  expect(next.activity).toEqual(adult.activity);
  expect(next.graduates[0].activity).toEqual({});
  expect(petsRaised(next)).toBe(2);
  expect(petsRaised(base)).toBe(1);
});
it('ranks by pets raised, streak and recent answers',()=>{
  expect(rankingScore({pets:1,streak:0,recent:0})).toBe(50);
  const busy=rankingScore({pets:1,streak:10,recent:120});
  const many=rankingScore({pets:3,streak:2,recent:10});
  expect(busy).toBeGreaterThan(rankingScore({pets:1,streak:10,recent:20}));
  expect(many).toBeGreaterThan(rankingScore({pets:2,streak:2,recent:10}));
  expect(rankingScore({pets:1,streak:11,recent:0})).toBeGreaterThan(rankingScore({pets:1,streak:10,recent:0}));
});
it('keeps only the login ID and pet name from the ranking response',()=>{
  expect(toRanking(null)).toEqual([]);
  const rows=[...Array(7)].map((_,i)=>({rank:i+1,username:`id${i}`,pet_name:`펫${i}`,extra:'x'}));
  rows.splice(1,0,{rank:9,username:null,pet_name:'x'});
  expect(toRanking(rows)).toEqual([0,1,2,3,4].map(i=>({rank:i+1,username:`id${i}`,petName:`펫${i}`})));
});
