import { SHOP_LEVEL, SLOTS, shopItems, limitedItems, canShop } from '../game/shop.js';
import { STREAK_REWARDS } from '../game/streak.js';

const rewardDays = id => STREAK_REWARDS.find(reward => reward.itemId === id)?.days;

export default function Shop({ pet, pending = false, onBuy, onEquip }) {
  const open = canShop(pet);
  return <section className="shop" aria-labelledby="shop-title">
    <h3 id="shop-title">꾸미기 상점</h3>
    <p>{open ? `성장 XP로 옷과 머리띠를 살 수 있어요. 지금 ${pet.totalXp} XP가 있어요. 구입해도 성장 단계는 그대로예요.` : `Lv.${SHOP_LEVEL} 성체가 되면 성장 XP로 옷과 머리띠를 살 수 있어요.`}</p>
    {Object.entries(SLOTS).map(([slot, label]) => <div key={slot} className="shop-slot">
      <h4>{label}</h4>
      <ul>{[...shopItems, ...limitedItems].filter(item => item.slot === slot).map(item => {
        const owned = pet.wardrobe.owned.includes(item.id), worn = pet.wardrobe.equipped[slot] === item.id;
        const short = item.price - pet.totalXp;
        if (item.limited) return <li key={item.id} className={`limited${worn ? ' worn' : owned ? ' owned' : ''}`}>
          <img src={`${import.meta.env.BASE_URL}pets/accessories/${item.id}.svg`} alt="" width="64" height="40" />
          <strong>{item.name}</strong>
          <span>{worn ? '✓ 착용 중' : owned ? '연속 학습 보상' : `🔥 연속 ${rewardDays(item.id)}일 보상`}</span>
          {owned
            ? <button disabled={pending || !open} aria-pressed={worn} onClick={() => onEquip(slot, worn ? null : item.id)}>{!open ? '성체부터' : worn ? '벗기' : '착용하기'}</button>
            : <button disabled>연속 {rewardDays(item.id)}일 달성 시</button>}
        </li>;
        return <li key={item.id} className={worn ? 'worn' : owned ? 'owned' : ''}>
          <img src={`${import.meta.env.BASE_URL}pets/accessories/${item.id}.svg`} alt="" width="64" height="40" />
          <strong>{item.name}</strong>
          <span>{worn ? '✓ 착용 중' : owned ? '보유 중' : `${item.price} XP`}</span>
          {owned
            ? <button disabled={pending} aria-pressed={worn} onClick={() => onEquip(slot, worn ? null : item.id)}>{worn ? '벗기' : '착용하기'}</button>
            : <button disabled={pending || !open || short > 0} onClick={() => onBuy(item)}>{!open ? '성체부터' : short > 0 ? `${short} XP 부족` : '구입하기'}</button>}
        </li>;
      })}</ul>
    </div>)}
  </section>;
}
