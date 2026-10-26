import { it, expect } from 'vitest';
import { credentialError, usernameToEmail, usernameFromEmail, resolveLogin, cloudChangedElsewhere, syncAction, authErrorMessage, readOwner, writeOwner, clearOwner } from '../src/game/account.js';
import { createPet, readSave, importSave, savePet, SAVE_KEY } from '../src/game/storage.js';
const t=Date.parse('2026-10-26T03:00:00Z');
const save=(name,time,xp=10)=>({...createPet(name,'chiikawa',t),totalXp:xp,lastUpdatedAt:new Date(time).toISOString()});
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}

it('accepts only simple IDs and passwords of six or more characters',()=>{
  expect(credentialError('coder_01','secret')).toBe('');
  expect(credentialError(' Coder01 ','secret')).toBe('');
  for(const id of ['abc','1coder','코더123','coder-01','a'.repeat(21),'kim@school'])expect(credentialError(id,'secret')).not.toBe('');
  expect(credentialError('coder01','12345')).not.toBe('');
});
it('maps IDs to internal addresses without asking for an email',()=>{
  expect(usernameToEmail(' Coder01 ','students.example.org')).toBe('coder01@students.example.org');
  expect(usernameFromEmail('coder01@students.example.org')).toBe('coder01');
});
it('carries a guest pet into a new or empty account',()=>{
  expect(resolveLogin({localSave:save('guest',t),localOwner:null,cloudSave:null,userId:'u1'})).toBe('upload');
  expect(resolveLogin({localSave:null,localOwner:null,cloudSave:null,userId:'u1'})).toBe('none');
});
it('continues the account pet on a fresh browser and follows the newer save for the same owner',()=>{
  expect(resolveLogin({localSave:null,localOwner:null,cloudSave:save('cloud',t),userId:'u1'})).toBe('download');
  expect(resolveLogin({localSave:save('p',t+5),localOwner:'u1',cloudSave:save('p',t),userId:'u1'})).toBe('upload');
  expect(resolveLogin({localSave:save('p',t),localOwner:'u1',cloudSave:save('p',t+5),userId:'u1'})).toBe('download');
});
it('asks before replacing when this browser holds a different pet',()=>{
  expect(resolveLogin({localSave:save('guest',t,40),localOwner:null,cloudSave:save('cloud',t,90),userId:'u1'})).toBe('ask');
  expect(resolveLogin({localSave:save('other',t),localOwner:'u2',cloudSave:save('mine',t),userId:'u1'})).toBe('ask');
  const same=save('same',t);
  expect(resolveLogin({localSave:{...same,lastUpdatedAt:new Date(t+9).toISOString()},localOwner:null,cloudSave:same,userId:'u1'})).toBe('download');
});
it('detects progress written by another device after the last sync',()=>{
  expect(cloudChangedElsewhere(null,0)).toBe(false);
  expect(cloudChangedElsewhere(save('p',t),t)).toBe(false);
  expect(cloudChangedElsewhere(save('p',t+1),t)).toBe(true);
});
it('shows friendly Korean messages for auth errors',()=>{
  expect(authErrorMessage({code:'user_already_exists'})).toMatch('이미 사용 중');
  expect(authErrorMessage({code:'invalid_credentials'})).toMatch('맞지 않아요');
  expect(authErrorMessage({status:429})).toMatch('잠시 후');
  expect(authErrorMessage(new TypeError('Failed to fetch'))).toMatch('인터넷');
});
it('stores the owner record per browser and tolerates broken values',()=>{
  const storage=memory();
  expect(readOwner(storage)).toBeNull();
  writeOwner('u1',t,storage);expect(readOwner(storage)).toEqual({id:'u1',syncedAt:t});
  storage.setItem('coding-pet-account-v1','{broken');expect(readOwner(storage)).toBeNull();
  clearOwner(storage);expect(readOwner(storage)).toBeNull();
});
it('imports an account save as-is and rejects invalid ones',()=>{
  const storage=memory();const cloud=save('cloud',t,120);
  const result=importSave(cloud,storage,t+10);
  expect(result.pet.petName).toBe('cloud');expect(result.pet.totalXp).toBe(120);expect(result.isNew).toBe(false);
  expect(JSON.parse(storage.getItem(SAVE_KEY)).lastUpdatedAt).toBe(cloud.lastUpdatedAt);
  expect(importSave({petName:''},storage,t)).toBeNull();
  expect(readSave(memory(),t)).toBeNull();
  savePet(cloud,storage,t+20);expect(readSave(storage,t+30).petName).toBe('cloud');
});
it('pulls another device’s newer save, uploads local changes and lets the newer save win a conflict',()=>{
  const synced=t;
  expect(syncAction({localSave:save('p',t),cloudSave:save('p',t),syncedAt:synced,localChanged:false})).toBe('none');
  expect(syncAction({localSave:save('p',t+5),cloudSave:save('p',t),syncedAt:synced,localChanged:true})).toBe('upload');
  expect(syncAction({localSave:save('p',t),cloudSave:save('p',t+9),syncedAt:synced,localChanged:false})).toBe('download');
  expect(syncAction({localSave:save('p',t+5),cloudSave:save('p',t+9),syncedAt:synced,localChanged:true})).toBe('download');
  expect(syncAction({localSave:save('p',t+12),cloudSave:save('p',t+9),syncedAt:synced,localChanged:true})).toBe('upload');
  expect(syncAction({localSave:save('p',t+5),cloudSave:null,syncedAt:synced,localChanged:true})).toBe('upload');
});
