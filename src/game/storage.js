import { emptyDaily, koreanDate } from './time.js';
export const SAVE_KEY='coding-pet-save-v1';
export const defaultPet=(now=Date.now())=>({schemaVersion:1,petName:'코코',hunger:70,cleanliness:70,affection:70,totalXp:0,lastUpdatedAt:new Date(now).toISOString(),daily:emptyDaily(now)});
export function validateSave(data, now = Date.now()) {
  if(!data || data.schemaVersion!==1 || typeof data.petName!=='string' || !data.petName.trim() || data.petName.length>20 || !['hunger','cleanliness','affection'].every(k=>Number.isInteger(data[k])&&data[k]>=0&&data[k]<=100) || !Number.isSafeInteger(data.totalXp)||data.totalXp<0 || typeof data.lastUpdatedAt!=='string'||!Number.isFinite(Date.parse(data.lastUpdatedAt))) return null;
  const pet = Object.fromEntries(Object.keys(defaultPet(now)).filter(k=>k!=='daily').map(k=>[k,data[k]]));
  // Optional extension of v1: keep the old key and preserve every existing pet.
  const daily = data.daily;
  const validDaily = daily && /^\d{4}-\d{2}-\d{2}$/.test(daily.date) &&
    Number.isInteger(daily.count) && daily.count >= 0 && daily.count <= 10 &&
    Array.isArray(daily.submittedIds) && daily.submittedIds.length === daily.count &&
    daily.submittedIds.every(id=>typeof id==='string' && id.length>0 && id.length<=200) &&
    new Set(daily.submittedIds).size === daily.count;
  pet.daily = validDaily && daily.date === koreanDate(now)
    ? {date:daily.date,count:daily.count,submittedIds:[...daily.submittedIds]}
    : emptyDaily(now);
  return pet;
}
export function loadPet(storage) {
  try { const raw=(storage ?? globalThis.localStorage).getItem(SAVE_KEY); if(raw===null)return {pet:defaultPet(),isNew:true,error:''}; const pet=validateSave(JSON.parse(raw)); return pet?{pet,isNew:false,error:''}:{pet:defaultPet(),isNew:true,error:'저장 기록을 읽을 수 없어 기본 상태로 복구했어요.'}; }
  catch { return {pet:defaultPet(),isNew:true,error:'저장소를 사용할 수 없거나 기록이 손상되었어요. 현재 게임은 계속할 수 있어요.'}; }
}
export function savePet(pet,storage) { try{(storage ?? globalThis.localStorage).setItem(SAVE_KEY,JSON.stringify({...pet,lastUpdatedAt:new Date().toISOString()}));return true;}catch{return false;} }
export function resetPet(storage) {try{(storage ?? globalThis.localStorage).removeItem(SAVE_KEY);return true;}catch{return false;} }
