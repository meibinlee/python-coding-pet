import { characterImage, characterFor, petMood } from '../data/characters.js';
import { useEffect, useRef, useState } from 'react';

export default function Pet({ pet, stage, limitReached = false, sick = false, sleeping = false, messy = false, cleaning = false, playing = false, vacation = false }) {
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

  const message = cleaning ? '반짝반짝! 청소를 마쳤어! ✦'
    : playing ? '함께 노니까 정말 신나! ♥'
    : petted ? '쓰다듬어 줘서 고마워! ♥'
    : vacation ? '다녀와! 여기서 편안히 쉬고 있을게 ☀'
    : sleeping ? (sick ? '조금 아파서 쉬고 있어. 간호해 줄래?' : '배불러서 잠깐 쉬고 있어… Zzz')
    : sick ? '조금 아파. 곁에서 보살펴 줄래?'
    : limitReached ? '오늘도 수고했어! 함께 쉬자.'
    : pet.hunger < 30 ? '코딩하고 맛있는 밥 먹을까?'
    : pet.affection >= 85 ? '네가 와서 기뻐!'
    : '함께 코딩할래?';

  const mood = petMood(pet,{sleeping,cleaning,sick,vacation,playing,petted});
  const src = characterImage(pet.characterId,stage.level,mood,import.meta.env.BASE_URL);
  return <div className={`pet-scene${cleaning ? ' room-cleaning' : ''}`}>
    <span className="spark s1" aria-hidden="true">✧</span>
    <span className="spark s2" aria-hidden="true">✦</span>
    <div className="bubble" role="status">{message}</div>
    <button className={`pet-button${petted ? ' petted' : ''}${sick ? ' sick-pet' : ''}${sleeping ? ' sleeping-pet' : ''}${vacation ? ' vacation-pet' : ''}`} onClick={petFriend} aria-label={`${pet.petName} 쓰다듬기`}>
      <img className="pet" src={src} alt={`${characterFor(pet.characterId)?.name ?? '친구'} · ${stage.name} 모습의 ${pet.petName}`} width="210" height="210" />
      {sleeping && <span className="sleep-mark" aria-hidden="true">Zzz</span>}
      {sick && <span className="pet-bandage" aria-hidden="true">✚</span>}
      {petted && <span className="pet-heart" aria-hidden="true">♥</span>}
    </button>
    <div className="ground" />
    {messy && <span className="room-mess" role="img" aria-label="방에 치울 배설물이 있어요">💩</span>}
    {cleaning && <span className="cleaning-sparkles" aria-hidden="true">✦ 🫧 ✧</span>}
    <span className="plant" aria-hidden="true">✿</span>
  </div>;
}
