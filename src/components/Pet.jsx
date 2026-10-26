import { characterImage, characterFor, petMood, accessoryAnchor } from '../data/characters.js';
import { SHOP_LEVEL, itemFor } from '../game/shop.js';
import { useEffect, useRef, useState } from 'react';

const TRASH = ['🥤', '🍂', '📄', '🧻'];

export default function Pet({ pet, stage, limitReached = false, sick = false, sickMessage = '', sleeping = false, full = false, messy = false, trash = 0, cleaning = false, playing = false, vacation = false }) {
  const [petted, setPetted] = useState(false);
  const cooldown = useRef(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  function petFriend() {
    if (cooldown.current) return;
    cooldown.current = true;
    setPetted(true);
    timer.current = setTimeout(() => {
      cooldown.current = false;
      setPetted(false);
    }, 1600);
  }

  const message = sleeping ? (sick ? '조금 아파서 쉬고 있어. 간호해 줄래?' : '배불러서 잠깐 쉬고 있어… Zzz')
    : sick ? (sickMessage ? `${sickMessage}. 보살펴 줄래?` : '조금 아파. 곁에서 보살펴 줄래?')
    : cleaning ? '반짝반짝! 깨끗해서 기분 좋아! ✦'
    : playing ? '함께 노니까 정말 신나! ♥'
    : petted ? '쓰다듬어 줘서 고마워! ♥'
    : vacation ? '다녀와! 여기서 편안히 쉬고 있을게 ☀'
    : full ? '이제 배불러요! 냠냠 잘 먹었어.'
    : limitReached ? '오늘도 수고했어! 함께 쉬자.'
    : pet.hunger < 30 ? '코딩하고 맛있는 밥 먹을까?'
    : pet.affection >= 85 ? '네가 와서 기뻐!'
    : '함께 코딩할래?';

  const mood = petMood(pet,{sleeping,cleaning,sick,vacation,playing,petted});
  const src = characterImage(pet.characterId,stage.level,mood,import.meta.env.BASE_URL);
  const anchor = accessoryAnchor(pet.characterId, mood);
  const worn = stage.level >= SHOP_LEVEL && anchor ? ['clothes','headband'].map(slot => itemFor(pet.wardrobe?.equipped?.[slot])).filter(Boolean) : [];
  const wornText = worn.length ? `, ${worn.map(item => item.name).join('·')} 착용` : '';
  return <div className={`pet-scene${cleaning ? ' room-cleaning' : ''}`}>
    <span className="spark s1" aria-hidden="true">✧</span>
    <span className="spark s2" aria-hidden="true">✦</span>
    <div className="bubble" role="status">{message}</div>
    <button className={`pet-button${petted ? ' petted' : ''}${sick ? ' sick-pet' : ''}${sleeping ? ' sleeping-pet' : ''}${vacation ? ' vacation-pet' : ''}`} onClick={petFriend} aria-label={`${pet.petName} 쓰다듬기`}>
      <span className="pet-figure" style={anchor ? {
        '--head-top': `${anchor.headTop}%`, '--head-x': `${anchor.headX}%`, '--head-width': `${anchor.headWidth}%`, '--head-rot': `${anchor.headRot}deg`,
        '--neck': `${anchor.neck}%`, '--neck-x': `${anchor.neckX}%`, '--clothes-width': `${anchor.clothesWidth}%`, '--neck-rot': `${anchor.neckRot}deg`,
        '--cape-top': `${anchor.capeTop}%`, '--cape-x': `${anchor.capeX}%`, '--cape-width': `${anchor.capeWidth}%`, '--cape-rot': `${anchor.capeRot}deg`,
      } : undefined}>
        <img className="pet" src={src} alt={`${characterFor(pet.characterId)?.name ?? '친구'} · ${stage.name} 모습의 ${pet.petName}${wornText}`} width="210" height="210" />
        {worn.map(item => <img key={item.id} className={`accessory acc-${item.slot} acc-${item.id}`} src={`${import.meta.env.BASE_URL}pets/accessories/${item.id}.svg`} alt="" aria-hidden="true" />)}
      </span>
      {sleeping && <span className="sleep-mark" aria-hidden="true">Zzz</span>}
      {sick && <span className="pet-bandage" aria-hidden="true">✚</span>}
      {petted && <span className="pet-heart" aria-hidden="true">♥</span>}
    </button>
    <div className="ground" />
    {Array.from({ length: trash }, (_, i) => <span key={i} className={`room-trash t${i}`} aria-hidden="true">{TRASH[i]}</span>)}
    {trash > 0 && <span className="visually-hidden">주변에 쓰레기 {trash}개가 있어요</span>}
    {messy && <span className="room-mess" role="img" aria-label="방에 치울 배설물이 있어요">💩</span>}
    {cleaning && <span className="cleaning-sparkles" aria-hidden="true">✦ 🫧 ✧</span>}
    <span className="plant" aria-hidden="true">✿</span>
  </div>;
}
