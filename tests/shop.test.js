import { it, expect } from 'vitest';
import { shopItems, buyItem, equipItem, normalizeWardrobe, newWardrobe, SLOTS } from '../src/game/shop.js';
import { createPet, loadPet, savePet, SAVE_KEY } from '../src/game/storage.js';
import { updateStored } from '../src/game/daily.js';
const start=Date.parse('2026-10-26T03:00:00Z');
const adult=(xp=200)=>({pet:{...createPet('friend','usagi',start),level:3,totalXp:xp},quiz:null});
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}

it('sells exactly three clothes and three headbands priced 30 to 80 XP',()=>{
  expect(shopItems.filter(i=>i.slot==='clothes')).toHaveLength(3);
  expect(shopItems.filter(i=>i.slot==='headband')).toHaveLength(3);
  expect(new Set(shopItems.map(i=>i.id)).size).toBe(6);
  expect(shopItems.every(i=>i.price>=30&&i.price<=80&&i.slot in SLOTS)).toBe(true);
});
it('opens only for adults and spends XP without lowering the stage',()=>{
  const baby={...adult(),pet:{...adult().pet,level:2}};
  expect(buyItem(baby,'scarf')).toBe(baby);
  const bought=buyItem(adult(200),'crown').pet;
  expect(bought.totalXp).toBe(120);expect(bought.level).toBe(3);
  expect(bought.wardrobe).toEqual({owned:['crown'],equipped:{clothes:null,headband:'crown'}});
});
it('blocks repeat purchases, unknown items and purchases without enough XP',()=>{
  const once=buyItem(adult(100),'ribbon');
  expect(buyItem(once,'ribbon')).toBe(once);
  expect(buyItem(adult(),'hat')).toEqual(adult());
  const poor=adult(79);expect(buyItem(poor,'cape')).toBe(poor);
  expect(buyItem(adult(80),'cape').pet.totalXp).toBe(0);
});
it('equips and removes owned items for free, one item per slot',()=>{
  let state=buyItem(buyItem(adult(200),'scarf'),'bowtie');
  expect(state.pet.wardrobe.equipped.clothes).toBe('bowtie');
  const xp=state.pet.totalXp;
  state=equipItem(state,'clothes','scarf');
  expect(state.pet.wardrobe.equipped.clothes).toBe('scarf');expect(state.pet.totalXp).toBe(xp);
  expect(equipItem(state,'clothes','cape')).toBe(state);
  expect(equipItem(state,'headband','scarf')).toBe(state);
  expect(equipItem(state,'clothes',null).pet.wardrobe.equipped.clothes).toBeNull();
});
it('repairs malformed wardrobe records and adds an empty wardrobe to older saves',()=>{
  expect(normalizeWardrobe({owned:['scarf','scarf','x',3],equipped:{clothes:'cape',headband:'scarf'}}))
    .toEqual({owned:['scarf'],equipped:{clothes:null,headband:null}});
  const old={...createPet('old','chiikawa',start),level:3,totalXp:300};delete old.wardrobe;
  const loaded=loadPet({getItem:()=>JSON.stringify(old)},start);
  expect(loaded.pet.wardrobe).toEqual(newWardrobe());expect(loaded.error).toBe('');expect(loaded.pet.totalXp).toBe(300);
});
it('saves a purchase once across reloads and does not charge twice on a stale tab',async()=>{
  const storage=memory();const state=adult(100);savePet(state.pet,storage,start);
  const first=await updateStored(state,s=>buyItem(s,'flower'),{storage,locks:null,now:start+1});
  expect(first.blocked).toBe(false);
  const stale=await updateStored(state,s=>buyItem(s,'flower'),{storage,locks:null,now:start+2});
  expect(stale.blocked).toBe(true);
  const saved=loadPet(storage,start+3).pet;
  expect(saved.totalXp).toBe(50);expect(saved.wardrobe.owned).toEqual(['flower']);
  expect(JSON.parse(storage.getItem(SAVE_KEY)).wardrobe.equipped.headband).toBe('flower');
});
