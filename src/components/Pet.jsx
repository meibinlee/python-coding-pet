import { useEffect, useRef, useState } from 'react';

export default function Pet({ pet, stage, limitReached = false, sick = false, sleeping = false }) {
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

  const message = petted ? '쓰다듬어 줘서 고마워! ♥'
    : sleeping ? (sick ? '조금 아파서 쉬고 있어. 간호해 줄래?' : '배불러서 잠깐 쉬고 있어… Zzz')
    : sick ? '조금 아파. 곁에서 보살펴 줄래?'
    : limitReached ? '오늘도 수고했어! 함께 쉬자.'
    : pet.hunger < 30 ? '코딩하고 맛있는 밥 먹을까?'
    : pet.affection >= 85 ? '네가 와서 기뻐!'
    : '함께 코딩할래?';

  return <div className="pet-scene">
    <span className="spark s1" aria-hidden="true">✧</span>
    <span className="spark s2" aria-hidden="true">✦</span>
    <div className="bubble" role="status">{message}</div>
    <button className={`pet-button${petted ? ' petted' : ''}${sick ? ' sick-pet' : ''}${sleeping ? ' sleeping-pet' : ''}`} onClick={petFriend} aria-label={`${pet.petName} 쓰다듬기`}>
      <img className="pet" src={`${import.meta.env.BASE_URL}pets/${stage.image}.svg`} alt={`${stage.name} 모습의 ${pet.petName}`} />
      {sleeping && <span className="sleep-mark" aria-hidden="true">Zzz</span>}
      {sick && <span className="pet-bandage" aria-hidden="true">✚</span>}
      {petted && <span className="pet-heart" aria-hidden="true">♥</span>}
    </button>
    <div className="ground" />
    <span className="plant" aria-hidden="true">✿</span>
  </div>;
}
