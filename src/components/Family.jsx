import { useState } from 'react';
import Pet from './Pet.jsx';
import StatusBars from './StatusBars.jsx';
import CharacterSelector from './CharacterSelector.jsx';
import { characterFor, characterImage } from '../data/characters.js';
import { growth, isRoomMessy } from '../game/rules.js';
import { healthStatus } from '../game/health.js';
import { sleepStatus } from '../game/sleep.js';
import { isFull, activeMood } from '../game/meal.js';
import { isOnVacation } from '../game/vacation.js';
import { trashCount, SICK_CAUSES, NEED_LABELS, RECOVER_NEED } from '../game/needs.js';
import { graduationStatus, remainingCharacters, isFamily, FAMILY_SIZE } from '../game/family.js';
import { formatWait } from '../game/time.js';
import { DEFAULT_PET_NAME } from '../game/storage.js';

const formatDay = value => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' }).format(new Date(value));

export function HealthDetails({ pet, health }) {
  return <section className="health-details is-sick" aria-label={`${pet.petName}의 건강과 회복 상태`} role="status">
    <h3>♡ {health.cause ? SICK_CAUSES[health.cause] : '조금 아파요'}</h3>
    <ul>
      <li>{health.recovering ? '✓' : '○'} 간호하기로 회복 시작</li>
      {health.recovering && <li>{health.remainingMs > 0 ? `○ 회복까지 ${formatWait(health.remainingMs)}` : '✓ 24시간 지남'}</li>}
      {health.recovering && <li>{health.needsFollowUp ? '○ 다른 날 한 번 더 간호' : '✓ 다른 날 간호 완료'}</li>}
      {health.cause && <li>{health.needsRefill ? '○' : '✓'} {NEED_LABELS[health.cause]} {RECOVER_NEED} 이상 채우기 (지금 {pet[health.cause]})</li>}
    </ul>
  </section>;
}

export function FamilyMember({ pet, now, limitReached = false }) {
  const stage = growth(pet.totalXp, pet.level), health = healthStatus(pet, now), mood = activeMood(pet, now);
  return <article className="family-member" aria-label={pet.petName}>
    <div className="member-heading">
      <span className="tag">{characterFor(pet.characterId)?.name}</span>
      <h3>{pet.petName}</h3>
      <span className="member-xp">{pet.totalXp} XP</span>
    </div>
    <Pet pet={pet} stage={stage} sick={health.sick} sickMessage={health.cause ? SICK_CAUSES[health.cause] : ''} sleeping={sleepStatus(pet, now).sleeping} full={isFull(pet, now)} messy={isRoomMessy(pet)} trash={trashCount(pet.cleanliness)} cleaning={mood === 'clean'} playing={mood === 'play'} vacation={isOnVacation(pet)} limitReached={limitReached} />
    {health.sick && <HealthDetails pet={pet} health={health} />}
    <StatusBars pet={pet} canSicken />
  </article>;
}

// Mount with key={pet.characterId} so the choices reset for each generation.
export function GraduationPanel({ pet, now, pending = false, onGraduate }) {
  const status = graduationStatus(pet, now);
  const options = remainingCharacters(pet);
  const [open, setOpen] = useState(false);
  const [character, setCharacter] = useState(options[0]?.id);
  const [name, setName] = useState('');
  if (!status.available) return null;
  return <section className="graduation-panel" aria-labelledby="graduation-title">
    <h3 id="graduation-title">🎓 졸업하고 다음 알 만나기</h3>
    <ul>
      <li>{status.remainingMs === 0 ? '✓' : '○'} 성체가 된 뒤 3일{status.remainingMs > 0 ? ` · ${formatWait(status.remainingMs)} 남음` : ''}</li>
      <li>{status.sick ? '○ 건강을 되찾아야 해요' : '✓ 건강해요'}</li>
    </ul>
    <p>졸업한 친구는 쉬면서 기다려요. 세 친구가 모두 자라면 다시 함께 지내요.</p>
    {!open ? <button className="primary" disabled={pending || !status.ready} onClick={() => setOpen(true)}>졸업 준비하기</button>
      : <form onSubmit={event => { event.preventDefault(); onGraduate(name, character); }}>
        <CharacterSelector value={character} onChange={setCharacter} options={options} disabled={pending} />
        <label htmlFor="next-pet-name">새 친구에게 이름을 지어 주세요</label>
        <input id="next-pet-name" maxLength={20} value={name} placeholder={DEFAULT_PET_NAME} onChange={event => setName(event.target.value)} autoComplete="off" />
        <div className="modal-actions">
          <button type="button" disabled={pending} onClick={() => setOpen(false)}>취소</button>
          <button className="primary" disabled={pending || !status.ready || !character}>졸업하고 새 알 받기</button>
        </div>
      </form>}
  </section>;
}

export function RestingGraduates({ pet }) {
  if (isFamily(pet) || !pet.graduates.length) return null;
  const left = FAMILY_SIZE - 1 - pet.graduates.length;
  return <section className="graduates" aria-labelledby="graduates-title">
    <h3 id="graduates-title">🎓 쉬고 있는 졸업생</h3>
    <p>{left === 0 ? `${pet.petName}이(가) 성체가 되면 세 친구가 함께 지내요.` : `친구 ${left + 1}마리가 더 자라면 모두 함께 지내요.`} 그동안 졸업생의 시간은 멈춰 있어요.</p>
    <ul>{pet.graduates.map(graduate => <li key={graduate.characterId}>
      <img src={characterImage(graduate.characterId, 3, 'normal', import.meta.env.BASE_URL)} alt={`${characterFor(graduate.characterId)?.name} 성체 모습의 ${graduate.petName}`} width="90" height="90" loading="lazy" />
      <strong>{graduate.petName}</strong>
      <span>{graduate.totalXp} XP · {graduate.graduatedAt ? `${formatDay(graduate.graduatedAt)} 졸업` : '졸업'}</span>
    </li>)}</ul>
  </section>;
}
