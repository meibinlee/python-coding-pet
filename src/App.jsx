import { useEffect, useRef, useState } from 'react';
import Pet from './components/Pet.jsx';
import StatusBars from './components/StatusBars.jsx';
import QuizModal from './components/QuizModal.jsx';
import { nextQuestion } from './game/questions.js';
import { actions, growth } from './game/rules.js';
import { currentDaily, nextKoreanMidnight } from './game/time.js';
import { DAILY_LIMIT, submitStored, updateStored, basicCare } from './game/daily.js';
import { SAVE_KEY, loadPet, savePet, resetPet, defaultPet } from './game/storage.js';

const SAVE_WARNING = '자동 저장에 실패했어요. 이 창을 닫으면 기록이 사라질 수 있어요.';
const LIMIT_MESSAGE = '오늘의 10문제를 모두 풀었어요. 한국 시간 자정부터 다시 풀 수 있어요.';

export default function App() {
  const [loaded] = useState(loadPet);
  const [state, setState] = useState({ pet: loaded.pet, quiz: null });
  const [started, setStarted] = useState(!loaded.isNew);
  const [name, setName] = useState(loaded.pet.petName);
  const [notice, setNotice] = useState(loaded.error);
  const [now, setNow] = useState(Date.now);
  const [pending, setPending] = useState(false);
  const history = useRef([]);
  const trigger = useRef(null);
  const submitting = useRef(false);
  const memoryOnly = useRef(false);
  const stage = growth(state.pet.totalXp);
  const daily = currentDaily(state.pet, now);

  useEffect(() => {
    let timer;
    const refresh = () => {
      const time = Date.now();
      setNow(time);
      clearTimeout(timer);
      timer = setTimeout(refresh, Math.min(30000, nextKoreanMidnight(time) - time + 1));
    };
    const sync = event => {
      if (event.key !== SAVE_KEY || submitting.current || memoryOnly.current) return;
      const saved = loadPet();
      if (!saved.isNew) setState(current => ({ ...current, pet: saved.pet }));
      refresh();
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('storage', sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('storage', sync);
    };
  }, []);

  async function performUpdate(update, successMessage = '') {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    try {
      const result = await update({ preferMemory: memoryOnly.current });
      setState(result.state);
      setNow(Date.now());
      if (!result.saved) {
        memoryOnly.current = true;
        setNotice(SAVE_WARNING);
      } else if (result.blocked && memoryOnly.current) {
        setNotice(SAVE_WARNING);
      } else if (result.blocked) {
        setNotice('이미 처리한 행동이거나 오늘의 횟수를 모두 사용했어요. 한국 시간 자정에 다시 만나요.');
      } else {
        memoryOnly.current = false;
        setNotice(successMessage);
      }
    } catch {
      setNotice('처리하지 못했어요. 잠시 후 다시 눌러 주세요.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  function start(event) {
    event.preventDefault();
    const pet = { ...state.pet, petName: name.trim() || '코코' };
    const saved = savePet(pet);
    memoryOnly.current = !saved;
    if (!saved) setNotice(SAVE_WARNING);
    setState(current => ({ ...current, pet }));
    setStarted(true);
  }

  function openQuiz(action) {
    const time = Date.now();
    setNow(time);
    if (currentDaily(state.pet, time).count >= DAILY_LIMIT) {
      setNotice(LIMIT_MESSAGE);
      return;
    }
    const question = nextQuestion(history.current);
    history.current = [...history.current, question].slice(-5);
    setState(current => ({ ...current, quiz: { question, action, answered: false } }));
  }

  function closeQuiz() {
    if (submitting.current) return;
    setState(current => ({ ...current, quiz: null }));
    requestAnimationFrame(() => {
      // The original action may be disabled after the tenth question.
      if (trigger.current?.disabled) document.querySelector('.care-panel button:not(:disabled), .reset')?.focus();
      else trigger.current?.focus();
    });
  }

  function reset() {
    if (submitting.current || !window.confirm('펫과 모든 학습 기록을 초기화할까요?')) return;
    const ok = resetPet();
    memoryOnly.current = !ok;
    setStarted(false);
    setName('코코');
    history.current = [];
    setState({ pet: defaultPet(), quiz: null });
    setNotice(ok ? '' : '저장소 기록을 삭제하지 못했어요. 브라우저의 사이트 데이터 설정을 확인해 주세요.');
  }

  return <div className="app">
    <header>
      <a href="./" className="brand"><span className="brand-icon">▦</span> 코딩 펫 <span className="brand-sub">작은 도전, 함께 자라는 하루</span></a>
      <button className="reset" disabled={pending} onClick={reset}>↻ 초기화</button>
    </header>
    <main>
      <div className="intro">
        <span className="eyebrow">MY LITTLE CODING FRIEND</span>
        <h1>코딩 한 걸음,<br className="mobile-break" /> 성장 한 뼘.</h1>
        <p>문제를 풀고, 나만의 작은 친구를 돌봐요.</p>
      </div>
      {!started ? <form className="welcome card" onSubmit={start}>
        <img src={`${import.meta.env.BASE_URL}pets/egg.svg`} alt="새로운 알 친구" />
        <h2>우리 처음 만났네!</h2>
        <label htmlFor="pet-name">펫에게 이름을 지어 주세요</label>
        <input id="pet-name" maxLength={20} value={name} onChange={event => setName(event.target.value)} autoComplete="off" />
        <p>학생 이름 대신 펫 이름만 입력해 주세요.</p>
        <button className="primary">함께 시작하기 →</button>
      </form> : <section className="card pet-card" aria-label="나의 펫">
        <div className="pet-heading">
          <div><span className="tag">Lv.{stage.level} · {stage.name}</span><h2>{state.pet.petName}<span className="tiny-heart"> ♥</span></h2></div>
          <div className="xp">
            <span>성장 경험치</span>
            <strong>{state.pet.totalXp} <small>{stage.next ? `/ ${stage.next} XP` : 'XP · 최고 단계'}</small></strong>
            <progress aria-label="성장 경험치" max={stage.next ? stage.next - stage.start : 1} value={stage.next ? state.pet.totalXp - stage.start : 1} />
          </div>
        </div>
        <Pet pet={state.pet} stage={stage} limitReached={daily.count >= DAILY_LIMIT} />
        <div className="pet-caption">{stage.next ? `다음 모습까지 ${stage.next - state.pet.totalXp} XP` : '멋진 친구로 자랐어요! 계속 함께해요.'}</div>
        <StatusBars pet={state.pet} />
        <div className="daily-summary" role="status">
          <strong>오늘 {daily.count} / {DAILY_LIMIT}문제 · 남은 문제 {DAILY_LIMIT - daily.count}개</strong>
          <p>{daily.count >= DAILY_LIMIT ? '오늘의 복습을 마쳤어요! 한국 시간 자정부터 다시 풀 수 있어요.' : '정답과 오답 모두 1문제를 사용해요. 한국 시간 자정에 새로 시작해요.'}</p>
        </div>
        <div className="actions">
          {Object.entries(actions).map(([action, label], index) => <button
            key={action} className={action} disabled={pending || daily.count >= DAILY_LIMIT}
            onClick={event => { trigger.current = event.currentTarget; openQuiz(action); }}
          ><span>{['🍙', '🧹', '🧸'][index]}</span><strong>{label}</strong><small>정답이면 +15</small></button>)}
        </div>
        <div className="care-panel">
          <button onClick={() => performUpdate(options => updateStored(state, basicCare, options), '오늘도 곁에서 돌봐 줬어요!')} disabled={pending || daily.careDone}>
            {daily.careDone ? '✓ 오늘 기본 돌봄 완료' : '♡ 기본 돌봄 하기'}
          </button>
          <p>하루 한 번, 문제를 풀지 않아도 돌볼 수 있어요.<br />XP와 상태 수치는 바뀌지 않아요.</p>
        </div>
        <ul className="care-checklist" aria-label="오늘의 돌봄 체크리스트">
          {Object.entries(actions).map(([action, label]) => <li key={action}>{daily.careActions.includes(action) ? '✓ 완료' : '○ 아직'} · {label}</li>)}
          <li>{daily.careDone ? '✓ 완료' : '○ 아직'} · 기본 돌봄</li>
        </ul>
        <p className="hint">✦ 코딩 문제 하나, 쑥쑥 자라는 우리 펫</p>
      </section>}
      <div className="learning-note"><span>✎</span><div><strong>매번 새로운 작은 도전</strong><p>6개 영역 · 30가지 문제 패턴으로 텍스트 기반 프로그래밍을 복습해요.</p></div></div>
      {notice && <p role="status" className="notice">{notice}</p>}
    </main>
    <footer>이 브라우저에 자동 저장돼요 · 계정 없이 즐기는 나만의 코딩 시간<br />사이트 데이터를 지우면 기록도 사라져요. 다른 기기와는 동기화되지 않아요.</footer>
    {state.quiz && <QuizModal quiz={state.quiz} pending={pending} limitReached={daily.count >= DAILY_LIMIT}
      onAnswer={answer => performUpdate(options => submitStored(state, answer, options))}
      onNext={() => openQuiz(state.quiz.action)} onClose={closeQuiz} />}
  </div>;
}
