import { it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { characters, characterImage, characterFor, petMood } from '../src/data/characters.js';
import { createPet, defaultPet, savePet, loadPet, SAVE_KEY } from '../src/game/storage.js';
import { selectCharacter } from '../src/game/album.js';
import { updateStored } from '../src/game/daily.js';
const now=Date.parse('2026-10-19T12:00:00Z');
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
it('offers exactly three named friends with egg, baby and adult images',()=>{
  expect(characters.map(c=>c.id)).toEqual(['chiikawa','hachiware','usagi']);
  expect(characters.map(c=>c.name)).toEqual(['치이카와','하치와레','우사기']);
  for(const character of characters)for(const stage of ['egg','baby','adult'])expect(character.images[stage].normal).toBeTruthy();
});
it('maps all 42 supplied and generated images to existing PNG files with portable ASCII paths',()=>{
  let count=0;
  for(const character of characters)for(const images of Object.values(character.images))for(const filename of Object.values(images)){
    const path=`public/pets/characters/${character.id}/${filename}`;
    expect(path).toMatch(/^[a-zA-Z0-9/.-]+$/);expect(existsSync(path)).toBe(true);
    expect(readFileSync(path).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))).toBe(true);count++;
  }
  expect(count).toBe(42);
});
it('uses the requested mood when supplied and stage-specific normal fallback for missing moods',()=>{
  expect(characterImage('chiikawa',3,'sleep','/app/')).toBe('/app/pets/characters/chiikawa/adult-sleep.png');
  expect(characterImage('usagi',3,'sleep','/app/')).toBe('/app/pets/characters/usagi/adult-sleep.png');
  expect(characterImage('hachiware',2,'sleep')).toContain('baby-sleep.png');
  expect(characterImage('usagi',1,'happy')).toContain('egg-normal.png');
  expect(characterImage('unknown',2)).toBe('./pets/baby.svg');
  expect(characterFor('unknown')).toBeNull();
});
it('prioritizes sleep, care and hunger consistently when resolving appearance',()=>{
  const pet={...defaultPet(now),hunger:10,affection:100};
  expect(petMood(pet)).toBe('hungry');expect(petMood(pet,{petted:true})).toBe('happy');
  expect(petMood(pet,{playing:true})).toBe('play');expect(petMood(pet,{cleaning:true})).toBe('clean');
  expect(petMood(pet,{sleeping:true,sick:true,cleaning:true})).toBe('sleep');
  expect(petMood(pet,{vacation:true})).toBe('normal');
});
it('creates and restores each selected character with the first album entry',()=>{
  const storage=memory();
  for(const character of characters){
    const pet=createPet(' 친구 ',character.id,now);expect(pet.petName).toBe('친구');
    expect(pet.characterId).toBe(character.id);expect(pet.album).toEqual([{level:1,characterId:character.id,reachedAt:new Date(now).toISOString(),legacy:false}]);
    savePet(pet,storage,now);expect(loadPet(storage,now).pet.characterId).toBe(character.id);
  }
  expect(()=>createPet('friend','invalid',now)).toThrow();
});
it('lets existing pets choose once without resetting any gameplay record, even on vacation',()=>{
  const pet={...defaultPet(now),level:3,totalXp:200,vacation:{startedAt:new Date(now).toISOString()}};
  const state={pet,quiz:null};const chosen=selectCharacter(state,'usagi');
  expect(chosen.pet.characterId).toBe('usagi');
  for(const key of ['totalXp','level','growth','health','sleep','room','vacation','daily','lastCareAt'])expect(chosen.pet[key]).toEqual(pet[key]);
  expect(selectCharacter(chosen,'hachiware')).toBe(chosen);
  expect(selectCharacter(state,'invalid')).toBe(state);
});
it('keeps the first selection when two stale tabs choose different friends',async()=>{
  const storage=memory(),pet=defaultPet(now);savePet(pet,storage,now);
  let queue=Promise.resolve();const locks={request(name,fn){const result=queue.then(fn);queue=result;return result;}};
  const results=await Promise.all(['hachiware','usagi'].map(id=>updateStored({pet,quiz:null},s=>selectCharacter(s,id),{storage,locks,now})));
  expect(results.filter(r=>r.blocked)).toHaveLength(1);
  expect(loadPet(storage,now).pet.characterId).toBe('hachiware');
});
it('migrates missing or invalid character IDs without losing XP and requests a fresh choice',()=>{
  const pet={...defaultPet(now),level:3,totalXp:200};delete pet.characterId;delete pet.album;
  const storage=memory();storage.setItem(SAVE_KEY,JSON.stringify(pet));
  const legacy=loadPet(storage,now);expect(legacy.error).toBe('');expect(legacy.pet.characterId).toBeNull();expect(legacy.pet.totalXp).toBe(200);
  storage.setItem(SAVE_KEY,JSON.stringify({...pet,characterId:'https://example.com/image.png'}));
  expect(loadPet(storage,now).error).toBeTruthy();expect(loadPet(storage,now).pet.level).toBe(3);
});

it('provides a sleeping image for every character and growth stage',()=>{
  for(const character of characters)for(const [index,stage] of ['egg','baby','adult'].entries()){
    expect(character.images[stage].sleep).toBe(`${stage}-sleep.png`);
    expect(characterImage(character.id,index+1,'sleep')).toContain(`${stage}-sleep.png`);
  }
});
