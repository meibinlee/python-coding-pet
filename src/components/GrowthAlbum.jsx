import { characterImage, characterFor } from '../data/characters.js';
const stageNames=['알','아기','성체'];
const formatDate=value=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));

export default function GrowthAlbum({ pet }) {
  return <section className="growth-album" aria-labelledby="album-title">
    <h3 id="album-title">함께 자란 성장 앨범</h3>
    <p>{characterFor(pet.characterId)?.name}와 함께한 순간을 이 브라우저에 기록해요.</p>
    <ol>
      {stageNames.map((name,index)=>{
        const level=index+1,entry=pet.album.find(item=>item.level===level);
        return <li key={level} className={entry?'recorded':'unrecorded'}>
          <img src={characterImage(entry?.characterId??pet.characterId,level,'normal',import.meta.env.BASE_URL)} alt={`${name} 모습${entry?'':' 미리보기'}`} width="100" height="100" loading="lazy" />
          <strong>Lv.{level} · {name}</strong>
          {entry ? <>
            <span>{entry.legacy?'이전부터 함께한 모습':level===1?'처음 만난 날':'성장한 날'}</span>
            {entry.reachedAt ? <time dateTime={entry.reachedAt}>{formatDate(entry.reachedAt)}</time> : <span>정확한 성장 시각 기록 없음</span>}
          </> : <span>{level<=pet.level?'이전 단계의 기록이 없어요':'아직 만나지 않은 모습이에요'}</span>}
        </li>;
      })}
    </ol>
  </section>;
}
