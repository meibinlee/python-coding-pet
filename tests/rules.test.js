import {it,expect} from 'vitest';
import {answerQuiz,growth,clamp} from '../src/game/rules.js';
import {defaultPet,loadPet,savePet,resetPet,SAVE_KEY} from '../src/game/storage.js';
const state=()=>({pet:defaultPet(),quiz:{question:{correctAnswer:'4',options:['4','5','6','7']},action:'hunger',answered:false}});
it('locks both correct and incorrect answers, including repeated queued updates',()=>{const initial=state();const once=answerQuiz(initial,'4');expect(once.pet.hunger).toBe(85);expect(once.pet.totalXp).toBe(10);expect(answerQuiz(once,'4')).toBe(once);const wrong=answerQuiz(initial,'5');expect(wrong.pet).toEqual(initial.pet);expect(answerQuiz(wrong,'4')).toBe(wrong);expect(answerQuiz(initial,'invalid')).toBe(initial);});
it('caps states, rewards every action and handles level boundaries',()=>{for(const action of ['hunger','cleanliness','affection']){const s=state();s.quiz.action=action;s.pet[action]=99;expect(answerQuiz(s,'4').pet[action]).toBe(100);}expect(clamp(-5)).toBe(0);expect(clamp(150)).toBe(100);expect([0,49,50,149,150].map(x=>growth(x).level)).toEqual([1,1,2,2,3]);});
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
it('saves, restores and resets without offline decay',()=>{const storage=memory();expect(loadPet(storage).isNew).toBe(true);const pet={...defaultPet(),petName:'테스트',totalXp:160};expect(savePet(pet,storage)).toBe(true);expect(loadPet(storage).pet).toMatchObject({petName:'테스트',totalXp:160,hunger:70});expect(resetPet(storage)).toBe(true);expect(storage.getItem(SAVE_KEY)).toBe(null);});
it('recovers from corrupted, unsupported or out of range data',()=>{const storage=memory();for(const raw of ['{','null','[]',JSON.stringify({...defaultPet(),hunger:101}),JSON.stringify({...defaultPet(),totalXp:-1}),JSON.stringify({...defaultPet(),schemaVersion:99}),JSON.stringify({...defaultPet(),lastUpdatedAt:'bad'})]){storage.setItem(SAVE_KEY,raw);expect(loadPet(storage).pet.hunger).toBe(70);expect(loadPet(storage).isNew).toBe(true);expect(loadPet(storage).error).toBeTruthy();}});
it('handles unavailable storage',()=>{const blocked={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};expect(loadPet(blocked).error).toBeTruthy();expect(savePet(defaultPet(),blocked)).toBe(false);expect(resetPet(blocked)).toBe(false);});
it('deducts five XP once for a wrong answer without changing stats or lowering the stage',()=>{
  for(const xp of [0,3,20,50,150]){
    const initial=state();initial.pet.totalXp=xp;initial.pet.level=growth(xp).level;
    const result=answerQuiz(initial,'5');
    expect(result.pet.totalXp).toBe(Math.max(0,xp-5));
    expect(result.quiz.xpChange).toBe(Math.max(0,xp-5)-xp);
    for(const key of ['hunger','cleanliness','affection'])expect(result.pet[key]).toBe(initial.pet[key]);
    expect(growth(result.pet.totalXp,result.pet.level).level).toBe(growth(xp).level);
    expect(answerQuiz(result,'5')).toBe(result);
    expect(answerQuiz(result,'4')).toBe(result);
  }
});
it('preserves reached stages through reload even when XP falls below their threshold',()=>{
  const storage=memory();
  for(const [level,totalXp] of [[2,0],[3,145]]){
    savePet({...defaultPet(),level,totalXp},storage);
    const restored=loadPet(storage).pet;
    expect(restored.level).toBe(level);
    expect(growth(restored.totalXp,restored.level).level).toBe(level);
  }
  const legacy={...defaultPet(),schemaVersion:1,totalXp:160};delete legacy.level;
  storage.setItem(SAVE_KEY,JSON.stringify(legacy));
  expect(loadPet(storage).pet.level).toBe(3);
});
