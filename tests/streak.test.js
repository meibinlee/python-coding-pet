import { it, expect } from 'vitest';
import { recordStudy, streakStatus, newStreak, normalizeStreak, STREAK_REWARDS } from '../src/game/streak.js';
import { createPet, loadPet, SAVE_KEY } from '../src/game/storage.js';
import { submitDaily, setVacation } from '../src/game/daily.js';
import { buyItem, equipItem, limitedItems } from '../src/game/shop.js';
import { DAY_MS, koreanDate } from '../src/game/time.js';
const start=Date.parse('2026-10-26T03:00:00Z');
const day=n=>start+n*DAY_MS;
function quiz(pet,id='q'){return {pet,quiz:{action:'affection',answered:false,question:{instanceId:id,options:['4','5','6','7'],correctAnswer:'4'}}};}
function studyDays(n,streak=newStreak()){for(let i=0;i<n;i++)streak=recordStudy(streak,day(i));return streak;}

it('counts one study day per Korean date and restarts after a missed day',()=>{
  let streak=recordStudy(newStreak(),start);
  expect(streak).toMatchObject({count:1,best:1,lastDate:koreanDate(start)});
  expect(recordStudy(streak,start+3600000)).toBe(streak);
  streak=recordStudy(streak,day(1));expect(streak.count).toBe(2);
  const pet={...createPet('a','usagi',start),streak};
  expect(streakStatus(pet,day(2)).count).toBe(2);
  expect(streakStatus(pet,day(3)).count).toBe(0);
  const restarted=recordStudy(streak,day(3));
  expect(restarted).toMatchObject({count:1,best:2});
});
it('unlocks the 7, 14 and 30 day limited accessories once each',()=>{
  expect(STREAK_REWARDS.map(r=>r.days)).toEqual([7,14,30]);
  expect(limitedItems.map(i=>i.id)).toEqual(STREAK_REWARDS.map(r=>r.itemId));
  expect(studyDays(6).rewards).toEqual([]);
  expect(studyDays(7).rewards).toEqual(['sprout']);
  expect(studyDays(14).rewards).toEqual(['sprout','medal']);
  const all=studyDays(30);expect(all.rewards).toEqual(['sprout','medal','rainbow']);
  const again=studyDays(7,{...recordStudy(all,day(40)),count:0});
  expect(again.rewards).toEqual(['sprout','medal','rainbow']);
});
it('only correct answers count, and a reward goes straight into the wardrobe',()=>{
  const pet={...createPet('a','usagi',start),level:3,totalXp:200,streak:{...studyDays(6),lastDate:koreanDate(day(-1))}};
  const wrong=submitDaily(quiz(pet),'5',start).pet;
  expect(wrong.streak).toBe(pet.streak);
  const right=submitDaily(quiz(pet),'4',start).pet;
  expect(right.streak).toMatchObject({count:7,rewards:['sprout']});
  expect(right.wardrobe.owned).toEqual(['sprout']);
  expect(equipItem({pet:right,quiz:null},'headband','sprout').pet.wardrobe.equipped.headband).toBe('sprout');
});
it('limited items are never sold',()=>{
  const state={pet:{...createPet('a','usagi',start),level:3,totalXp:500},quiz:null};
  for(const item of limitedItems)expect(buyItem(state,item.id)).toBe(state);
});
it('vacation days neither break nor extend the streak',()=>{
  const pet={...createPet('a','usagi',start),streak:studyDays(3)};
  const away=setVacation({pet,quiz:null},true,day(3)).pet;
  expect(streakStatus(away,day(10)).count).toBe(3);
  const back=setVacation({pet:away,quiz:null},false,day(10)).pet;
  expect(streakStatus(back,day(10)).count).toBe(3);
  expect(recordStudy(back.streak,day(10)).count).toBe(4);
  expect(streakStatus(back,day(11)).count).toBe(0);
  const broken={...pet,streak:{...pet.streak,lastDate:koreanDate(day(-5))}};
  const late=setVacation({pet:setVacation({pet:broken,quiz:null},true,day(3)).pet,quiz:null},false,day(10)).pet;
  expect(streakStatus(late,day(10)).count).toBe(0);
});
it('repairs streak records and adds an empty one to older saves',()=>{
  expect(normalizeStreak({count:5,best:2,lastDate:koreanDate(day(5)),rewards:['sprout','x']},start)).toEqual({count:0,best:2,lastDate:null,rewards:[]});
  expect(normalizeStreak({count:8,best:8,lastDate:koreanDate(start),rewards:['medal','sprout']},start)).toEqual({count:8,best:8,lastDate:koreanDate(start),rewards:['sprout']});
  const old=createPet('a','usagi',start);delete old.streak;
  const loaded=loadPet({getItem:k=>k===SAVE_KEY?JSON.stringify(old):null},start);
  expect(loaded.error).toBe('');expect(loaded.pet.streak).toEqual(newStreak());
  const bad=loadPet({getItem:()=>JSON.stringify({...old,streak:{count:3,best:3,lastDate:'2099-01-01',rewards:[]}})},start);
  expect(bad.error).toBeTruthy();expect(bad.pet.streak.count).toBe(0);
});
