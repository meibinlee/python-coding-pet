import { characters, characterImage } from '../data/characters.js';

export default function CharacterSelector({ value, onChange, disabled = false, options = characters }) {
  return <fieldset className="character-selector" disabled={disabled}>
    <legend>함께 키울 친구를 선택해 주세요</legend>
    <div className={`character-options count-${options.length}`}>
      {options.map(character => <label key={character.id} className={`character-option${value === character.id ? ' selected' : ''}`}>
        <input type="radio" name="character" value={character.id} checked={value === character.id} onChange={() => onChange(character.id)} required />
        <img src={characterImage(character.id,2,'normal',import.meta.env.BASE_URL)} alt={`${character.name} 아기 모습`} width="110" height="110" />
        <strong>{character.name}</strong>
        <span>{value === character.id ? '✓ 선택한 친구' : '이 친구 선택하기'}</span>
      </label>)}
    </div>
    <p>어느 친구든 같은 규칙으로 자라요. 시작한 뒤에는 선택한 친구와 함께해요.</p>
  </fieldset>;
}
