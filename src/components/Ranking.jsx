import { useEffect, useState } from 'react';
import { fetchRanking } from '../game/cloud.js';
import { PixelIcon } from './PixelIcon.jsx';

const REFRESH_MS = 2 * 60 * 1000;

// Top 5 growing pets from all accounts. Shown beside the pet on wide screens and at the bottom on phones.
export function Ranking({ username }) {
  const [ranking, setRanking] = useState({ status: 'loading', rows: [] });

  useEffect(() => {
    let active = true;
    const load = () => fetchRanking()
      .then(rows => { if (active) setRanking({ status: 'ready', rows }); })
      .catch(() => { if (active) setRanking(current => current.rows.length ? current : { status: 'error', rows: [] }); });
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    load();
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [username]);

  return <aside className="ranking" aria-labelledby="ranking-title">
    <h2 id="ranking-title"><PixelIcon name="star" /> 열심히 크고 있는 코딩 펫</h2>
    {ranking.status === 'loading' && <p className="ranking-note">순위를 불러오는 중…</p>}
    {ranking.status === 'error' && <p className="ranking-note">지금은 순위를 불러올 수 없어요.</p>}
    {ranking.status === 'ready' && !ranking.rows.length && <p className="ranking-note">아직 순위에 오른 펫이 없어요.</p>}
    {ranking.rows.length > 0 && <ol className="ranking-list">
      {ranking.rows.map(row => {
        const mine = Boolean(username) && row.username === username;
        return <li key={`${row.rank}-${row.username}`} className={mine ? 'mine' : undefined}>
          <span className={`ranking-rank r${row.rank}`}>{row.rank}<span className="visually-hidden">위</span></span>
          <span className="ranking-who">
            <strong>{row.petName}</strong>
            <small>{row.username}{mine ? ' (나)' : ''}</small>
          </span>
        </li>;
      })}
    </ol>}
    <p className="ranking-note">키운 펫 수 · 연속 학습 · 최근 7일 정답 수로 매겨요.</p>
  </aside>;
}
