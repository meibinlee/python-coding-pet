// Adult-only accessory shop. Spending XP never lowers the reached stage.
export const SHOP_LEVEL = 3;
export const SLOTS = { clothes: '옷', headband: '머리띠' };
export const shopItems = [
  { id: 'scarf', slot: 'clothes', name: '딸기 스카프', price: 30 },
  { id: 'bowtie', slot: 'clothes', name: '하늘 나비넥타이', price: 50 },
  { id: 'cape', slot: 'clothes', name: '별빛 망토', price: 80 },
  { id: 'ribbon', slot: 'headband', name: '리본 머리띠', price: 30 },
  { id: 'flower', slot: 'headband', name: '꽃 머리띠', price: 50 },
  { id: 'crown', slot: 'headband', name: '왕관 머리띠', price: 80 },
];
export const itemFor = id => shopItems.find(item => item.id === id) ?? null;
export const newWardrobe = () => ({ owned: [], equipped: { clothes: null, headband: null } });
export const canShop = pet => pet.level >= SHOP_LEVEL;

export function normalizeWardrobe(record) {
  const owned = Array.isArray(record?.owned) ? [...new Set(record.owned.filter(id => itemFor(id)))] : [];
  const equipped = {};
  for (const slot of Object.keys(SLOTS)) {
    const id = record?.equipped?.[slot];
    equipped[slot] = owned.includes(id) && itemFor(id).slot === slot ? id : null;
  }
  return { owned, equipped };
}

// A purchase equips the item right away; returning the same state means "blocked".
export function buyItem(state, itemId) {
  const item = itemFor(itemId), pet = state.pet;
  if (!item || !canShop(pet) || pet.wardrobe.owned.includes(itemId) || pet.totalXp < item.price) return state;
  return { ...state, pet: { ...pet, totalXp: pet.totalXp - item.price, wardrobe: {
    owned: [...pet.wardrobe.owned, itemId],
    equipped: { ...pet.wardrobe.equipped, [item.slot]: itemId },
  } } };
}

// Wearing or taking off an owned item is free. itemId null clears the slot.
export function equipItem(state, slot, itemId) {
  const pet = state.pet;
  if (!(slot in SLOTS) || pet.wardrobe.equipped[slot] === itemId) return state;
  if (itemId !== null && (!pet.wardrobe.owned.includes(itemId) || itemFor(itemId).slot !== slot)) return state;
  return { ...state, pet: { ...pet, wardrobe: { ...pet.wardrobe, equipped: { ...pet.wardrobe.equipped, [slot]: itemId } } } };
}
