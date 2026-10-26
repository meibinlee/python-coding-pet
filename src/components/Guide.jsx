import { useEffect, useRef, useState } from 'react';

// One source for both the first-run tutorial and the "사용방법" panel.
export const guideSteps = [
  { icon: '✎', title: '문제를 풀어 돌봐요', items: [
    '🍙 먹이 · 🧹 청소 · 🧸 놀이 버튼을 누르면 코딩 문제가 나와요.',
    '정답이면 그 수치 +15, 경험치 +10. 오답이면 경험치 −5 (최저 0).',
    '하루 10문제까지 풀 수 있어요. 한국 시간 자정에 새로 시작해요.',
  ] },
  { icon: '♥', title: '세 가지 수치를 지켜 줘요', items: [
    '🍙 배부름: 1시간마다 1씩 줄어요. 0이 되면 배가 고파 아파요.',
    '🫧 청결·면역: 2시간마다 1씩 줄고 주변에 쓰레기가 생겨요. 0이 되면 면역력이 떨어져 아파요.',
    '♥ 사랑: 1.5시간마다 1씩 줄어요. 0이 되면 외로워서 아파요.',
    '아기 단계부터 아플 수 있어요. 펫은 죽거나 단계가 내려가지 않아요.',
  ] },
  { icon: '🍙', title: '밥과 낮잠', items: [
    '밥을 2번 먹으면 배가 불러 3시간 동안 밥을 쉬어요.',
    '배부름이 100이 되면 10분 낮잠을 자요. 그동안 청소·놀이는 할 수 있어요.',
    '밥을 2번 먹을 때마다 방에 치울 것이 생겨요. 청소 정답으로 치워요.',
    '청소하면 반짝이는 모습이, 놀아 주면 신나는 모습이 30분 동안 이어져요.',
  ] },
  { icon: '✚', title: '아플 때는 간호해요', items: [
    '♡ 간호하기를 눌러 회복을 시작해요.',
    '회복하려면 첫 간호 후 24시간, 다른 날 한 번 더 간호, 아픈 원인 수치 30 이상이 모두 필요해요.',
    '아파도 문제는 풀 수 있지만 성장은 기다려요.',
  ] },
  { icon: '✦', title: '쑥쑥 자라요', items: [
    '알 → 아기: 경험치 50 · 48시간 · 돌본 날 2일.',
    '아기 → 성체: 경험치 150 · 96시간 · 돌본 날 4일.',
    '알·아기 때는 먹이·청소·놀이를 각각 4시간 넘게 안 하면 경험치가 1씩 줄어요.',
    '♡ 기본 돌봄은 하루 한 번, 문제 없이 돌본 날을 기록해요.',
  ] },
  { icon: '☀', title: '그 밖의 기능', items: [
    '휴가: 여행 갈 때 켜면 수치·성장·아픔 시간이 모두 멈춰요.',
    '성체가 되면 꾸미기 상점에서 경험치로 옷과 머리띠를 살 수 있어요.',
    '로그인하면 다른 기기에서도 같은 펫을 이어서 키워요.',
    '펫을 누르면 쓰다듬을 수 있어요.',
  ] },
];

export function GuideContent({ onTutorial }) {
  return <div className="guide-content">
    {guideSteps.map(step => <details key={step.title} className="guide-topic">
      <summary><span aria-hidden="true">{step.icon}</span> {step.title}</summary>
      <ul>{step.items.map(item => <li key={item}>{item}</li>)}</ul>
    </details>)}
    {onTutorial && <button className="guide-replay" onClick={onTutorial}>▶ 튜토리얼 다시 보기</button>}
  </div>;
}

export function GuideDialog({ onClose, onTutorial }) {
  const dialog = useRef(null);
  useEffect(() => { const el = dialog.current; el.showModal(); return () => el.close(); }, []);
  return <dialog ref={dialog} className="guide-dialog" aria-labelledby="guide-dialog-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="modal-top"><h2 id="guide-dialog-title">사용방법</h2><button onClick={onClose} aria-label="사용방법 닫기">✕</button></div>
    <GuideContent onTutorial={onTutorial} />
  </dialog>;
}

export function Tutorial({ onClose }) {
  const dialog = useRef(null);
  const [index, setIndex] = useState(0);
  useEffect(() => { const el = dialog.current; el.showModal(); return () => el.close(); }, []);
  useEffect(() => { dialog.current.querySelector('.tutorial-next')?.focus(); }, [index]);
  const step = guideSteps[index], last = index === guideSteps.length - 1;
  return <dialog ref={dialog} className="tutorial" aria-labelledby="tutorial-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="modal-top"><span className="tag">튜토리얼 {index + 1} / {guideSteps.length}</span><button onClick={onClose}>건너뛰기</button></div>
    <div className="tutorial-icon" aria-hidden="true">{step.icon}</div>
    <h2 id="tutorial-title">{step.title}</h2>
    <ul>{step.items.map(item => <li key={item}>{item}</li>)}</ul>
    <div className="tutorial-dots" aria-hidden="true">{guideSteps.map((_, i) => <span key={i} className={i === index ? 'on' : ''} />)}</div>
    <div className="modal-actions">
      <button disabled={index === 0} onClick={() => setIndex(index - 1)}>← 이전</button>
      <button className="primary tutorial-next" onClick={() => last ? onClose() : setIndex(index + 1)}>{last ? '시작하기 ✓' : '다음 →'}</button>
    </div>
    <p className="tutorial-note">언제든 오른쪽(작은 화면은 위쪽)의 사용방법에서 다시 볼 수 있어요.</p>
  </dialog>;
}
