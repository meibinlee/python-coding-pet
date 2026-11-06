import { it, expect } from 'vitest';
import { readPending, writePending, clearPending, PENDING_KEY } from '../src/game/pendingQuiz.js';
import { nextQuestion } from '../src/game/questions.js';
import { challengeQuestion } from '../src/game/quest.js';
import { keepDailyProgress } from '../src/game/account.js';
import { createPet, validateSave } from '../src/game/storage.js';
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}

it('keeps the same unanswered question across reloads on the same day',()=>{
  const store=memory(), question=nextQuestion([]);
  expect(readPending('2026-11-06',store)).toBeNull();
  writePending(question,'2026-11-06',store);
  expect(readPending('2026-11-06',store)).toEqual(question);
  clearPending(store);
  expect(readPending('2026-11-06',store)).toBeNull();
});
it('keeps challenge questions too and drops other days or damaged records',()=>{
  const store=memory(), challenge=challengeQuestion('2026-11-06',0);
  writePending(challenge,'2026-11-06',store);
  expect(readPending('2026-11-06',store)).toEqual(challenge);
  expect(readPending('2026-11-07',store)).toBeNull();
  expect(store.getItem(PENDING_KEY)).toBeNull();
  store.setItem(PENDING_KEY,'{bad');
  expect(readPending('2026-11-06',store)).toBeNull();
  store.setItem(PENDING_KEY,JSON.stringify({date:'2026-11-06',question:{instanceId:'x',options:[1,2]}}));
  expect(readPending('2026-11-06',store)).toBeNull();
});

const t=Date.parse('2026-11-06T05:00:00Z'), date='2026-11-06';
const withDaily=(daily,quest)=>({...createPet('파이썬','chiikawa',t),daily:{date,period:13,count:0,answered:0,submittedIds:[],careDone:false,nursingDone:false,careActions:[],last:null,...daily},quest:{date:null,results:[],stars:0,items:[],...quest}});
it('a download never brings back questions this browser already answered today',()=>{
  const cloud=withDaily({count:1,answered:2,submittedIds:['a']},{date,results:[true],stars:3});
  const local=withDaily({count:3,answered:5,submittedIds:['a','b','c']},{date,results:[true,false],stars:1});
  const merged=keepDailyProgress(cloud,local);
  expect(merged.daily).toMatchObject({count:3,answered:5,submittedIds:['a','b','c']});
  expect(merged.quest).toMatchObject({results:[true,false],stars:3});
  expect(validateSave(merged,t)).not.toBeNull();
  expect(validateSave(merged,t).daily.count).toBe(3);
});
it('leaves the cloud save alone when it is already ahead or from another day',()=>{
  const cloud=withDaily({count:4,answered:6,submittedIds:['a','b','c','d']});
  expect(keepDailyProgress(cloud,withDaily({count:2,answered:3,submittedIds:['a','b']}))).toBe(cloud);
  const yesterday={...withDaily({count:5,answered:9,submittedIds:['a','b','c','d','e']}),daily:{...withDaily({}).daily,date:'2026-11-05',count:5,answered:9,submittedIds:['a','b','c','d','e']}};
  expect(keepDailyProgress(cloud,yesterday)).toBe(cloud);
});
it('keeps the newer charge period from this browser',()=>{
  const cloud=withDaily({period:7,count:10,answered:11,submittedIds:[...'abcdefghij']});
  const local=withDaily({period:13,count:1,answered:12,submittedIds:['k']});
  expect(keepDailyProgress(cloud,local).daily).toMatchObject({period:13,count:1,answered:12,submittedIds:['k']});
});

it('remembers answered questions across reloads and never repeats the last pattern',async()=>{
  const { readRecent, addRecent, clearRecent } = await import('../src/game/pendingQuiz.js');
  const store=memory();
  let rng=1;const next=()=>{rng=(1664525*rng+1013904223)>>>0;return rng/4294967296;};
  let previous=null;
  for(let i=0;i<300;i++){
    // Every question starts from a fresh "page load": only storage carries the history.
    const recent=readRecent(store), q=nextQuestion(recent,next);
    if(previous)expect(q.templateId).not.toBe(previous.templateId);
    expect(recent.some(item=>item.templateId===q.templateId&&item.code===q.code)).toBe(false);
    addRecent(q,store);previous=q;
  }
  expect(readRecent(store)).toHaveLength(10);
  clearRecent(store);
  expect(readRecent(store)).toEqual([]);
});
