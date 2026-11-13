import { PixelIcon, iconText } from './PixelIcon.jsx';
import { NEED_LABELS, LOW_NEED } from '../game/needs.js';
export default function StatusBars({ pet, canSicken = false }) {
  return <div className="status-bars">{[['hunger', 'rice'], ['cleanliness', 'bubble'], ['affection', 'heart']].map(([key, icon]) => {
    const low = canSicken && pet[key] <= LOW_NEED;
    return <div className={`status ${key}${low ? ' low' : ''}`} key={key}>
      <span className="status-icon" aria-hidden="true"><PixelIcon name={icon} size="22px" /></span>
      <div className="status-body">
        <div><span>{NEED_LABELS[key]}</span><strong>{pet[key]}</strong></div>
        <progress aria-label={NEED_LABELS[key]} max="100" value={pet[key]} />
        {low && <em className="status-warn">⚠ {pet[key] === 0 ? '아파요' : '곧 아파요'}</em>}
      </div>
    </div>;
  })}</div>;
}
