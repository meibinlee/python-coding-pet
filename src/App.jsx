import { useEffect, useRef, useState } from 'react';
import Pet from './components/Pet.jsx';
import StatusBars from './components/StatusBars.jsx';
import QuizModal from './components/QuizModal.jsx';
import { nextQuestion } from './game/questions.js';
import { actions, growth, growthStatus, refreshGrowth } from './game/rules.js';
import { sleepStatus, isActionResting } from './game/sleep.js';
import { healthStatus } from './game/health.js';
import { currentDaily, nextKoreanMidnight } from './game/time.js';
import { DAILY_LIMIT, submitStored, updateStored, basicCare } from './game/daily.js';
import { SAVE_KEY, loadPet, savePet, resetPet, defaultPet } from './game/storage.js';

const SAVE_WARNING = '자동 저장에 실패했어요. 이 창을 닫으면 기록이 사라질 수 있어요.';
const LIMIT_MESSAGE = '오늘의 10문제를 모두 풀었어요. 한국 시간 자정부터 다시 풀 수 있어요.';

function formatWait(ms) {
  const minutes = Math.ceil(ms / 60000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
}

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
  const stateRef = useRef(state);
  stateRef.current = state;
  const stage = growth(state.pet.totalXp, state.pet.level);
  const growthProgress = growthStatus(state.pet, now);
  const remainingTime = formatWait(growthProgress.remainingMs);
  const health = healthStatus(state.pet, now);
  const nap = sleepStatus(state.pet, now);
  const daily = currentDaily(state.pet, now);

  useEffect(() => {
    let timer;
    let active = true;
    const refresh = () => {
      const time = Date.now();
      setNow(time);
      clearTimeout(timer);
      const status = growthStatus(stateRef.current.pet, time);
      const healthTime = healthStatus(stateRef.current.pet, time).nextCheckMs;
      const napTime = sleepStatus(stateRef.current.pet, time).remainingMs;
      timer = setTimeout(refresh, Math.min(30000, napTime > 0 ? napTime + 1 : 30000, healthTime > 0 ? healthTime + 1 : 30000, nextKoreanMidnight(time) - time + 1, status.remainingMs > 0 ? status.remainingMs + 1 : 30000));
      if (!submitting.current) {
        const snapshot = stateRef.current.pet;
        updateStored(stateRef.current, refreshGrowth, { preferMemory: memoryOnly.current }).then(result => {
          if (!active) return;
          setState(current => current.pet === snapshot ? { ...current, pet: result.state.pet } : current);
          if (!result.saved) { memoryOnly.current = true; setNotice(SAVE_WARNING); }
          else if (memoryOnly.current && stateRef.current.pet === snapshot) {
            memoryOnly.current = false;
            setNotice(current => current === SAVE_WARNING ? '' : current);
          }
        }).catch(() => { if (active) setNotice('펫 상태를 확인하지 못했어요. 잠시 후 다시 확인할게요.'); });
      }
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
      active = false;
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
    const pet = { ...defaultPet(), petName: name.trim() || '코코' };
    const saved = savePet(pet);
    memoryOnly.current = !saved;
    if (!saved) setNotice(SAVE_WARNING);
    setState(current => ({ ...current, pet }));
    setStarted(true);
  }

  function openQuiz(action) {
    const time = Date.now();
    setNow(time);
    if (isActionResting(state.pet, action, time)) {
      setNotice('낮잠 중에는 먹이를 잠시 쉬어요. 청소나 놀이를 선택해 주세요.');
      return;
    }
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

  async function reset() {
    if (submitting.current || !window.confirm('펫과 모든 학습 기록을 초기화할까요?')) return;
    submitting.current = true;
    setPending(true);
    try {
      const locks = globalThis.navigator?.locks;
      const ok = locks?.request ? await locks.request('coding-pet-save', () => resetPet()) : resetPet();
      memoryOnly.current = !ok;
      setStarted(false);
      setName('코코');
      history.current = [];
      setState({ pet: defaultPet(), quiz: null });
      setNotice(ok ? '' : '저장소 기록을 삭제하지 못했어요. 브라우저의 사이트 데이터 설정을 확인해 주세요.');
    } catch {
      setNotice('초기화하지 못했어요. 잠시 후 다시 눌러 주세요.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
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
            <progress aria-label="성장 경험치" max={stage.next ? stage.next - stage.start : 1} value={stage.next ? Math.min(stage.next - stage.start, Math.max(0, state.pet.totalXp - stage.start)) : 1} />
          </div>
        </div>
        <Pet pet={state.pet} stage={stage} sick={health.sick} sleeping={nap.sleeping} limitReached={daily.count >= DAILY_LIMIT} />
        <div className="pet-caption">{stage.next ? '경험치와 함께한 시간이 모이면 성장해요.' : '멋진 친구로 자랐어요! 계속 함께해요.'}</div>
        {nap.sleeping && <section className="sleep-details" aria-label="낮잠 상태" role="status">
          <h3>☾ 배불러서 낮잠 자는 중이에요</h3>
          <p>약 {formatWait(nap.remainingMs)} 뒤에 깨어나요. 새로고침해도 같은 시간에 일어나요.</p>
          <p id="sleep-note">먹이는 잠시 쉬고 청소·놀이 문제를 풀어 주세요. 기본 돌봄과 간호도 가능해요.</p>
          {health.sick && <p>자는 동안에도 간호가 필요해요. 아래 회복 조건을 함께 확인해 주세요.</p>}
        </section>}
        {stage.level >= 2 && <section className={`health-details${health.sick ? ' is-sick' : ''}`} aria-label="건강과 회복 상태" role="status">
          <h3>{health.sick ? (health.recovering ? '♡ 함께 회복하는 중이에요' : '♡ 조금 아파요. 하루 동안 함께 보살펴 주세요.') : '✓ 편안하게 지내고 있어요'}</h3>
          {health.sick ? <>
            <p>{health.recovering ? '첫 간호부터 실제 24시간과 다른 한국 날짜의 추가 간호가 모두 필요해요.' : '간호하기를 눌러 회복을 시작해 주세요. 첫 간호부터 실제 24시간과 다른 한국 날짜의 추가 간호가 필요해요.'}</p>
            {health.recovering && <ul>
              <li>{health.remainingMs > 0 ? `○ 회복까지 ${formatWait(health.remainingMs)} 남았어요` : '✓ 회복 시간 24시간을 채웠어요'}</li>
              <li>{health.needsFollowUp ? '○ 첫 간호와 다른 한국 날짜에 한 번 더 간호해 주세요' : '✓ 다른 날짜의 추가 간호를 기록했어요'}</li>
            </ul>}
            {health.extraNursing && <p>오늘 기본 돌봄을 마쳤어도 회복을 시작하는 첫 간호는 할 수 있어요.</p>}
            <p>아파도 학습과 돌봄은 가능해요. 성장은 회복할 때까지 기다려요.</p>
          </> : <p>정답 돌봄이나 기본 돌봄으로 건강을 지켜요. 마지막 돌봄부터 24시간을 넘기면 아플 수 있어요. 펫은 죽거나 단계가 내려가지 않아요.</p>}
        </section>}
        {stage.next && <section className="growth-details" aria-label="다음 성장 조건">
          <h3>{stage.level === 1 ? '아기' : '성체'}가 되려면</h3>
          <ul>
            <li>{growthProgress.xpRemaining === 0 ? '✓ 달성' : '○ 더 필요해요'} · 경험치 {state.pet.totalXp} / {stage.next} XP</li>
            <li>{growthProgress.remainingMs === 0 ? '✓ 달성' : `○ ${remainingTime} 남았어요`} · {stage.level === 1 ? '육성 시작 후 48시간' : '아기가 된 뒤 96시간'}</li>
            <li>{growthProgress.careDays >= stage.days ? '✓ 달성' : '○ 더 필요해요'} · 돌본 날짜 {Math.min(growthProgress.careDays,stage.days)} / {stage.days}일</li>
          </ul>
          <p>{health.sick ? '아픈 동안은 성장 대기 중이에요. 회복 후 조건을 다시 확인해요. ' : ''}세 조건을 모두 채우면 성장해요. 정답 돌봄 또는 기본 돌봄으로 하루를 기록해요. 오답·쓰다듬기는 돌본 날짜에 포함되지 않아요.</p>
        </section>}
        <StatusBars pet={state.pet} />
        <div className="daily-summary" role="status">
          <strong>오늘 {daily.count} / {DAILY_LIMIT}문제 · 남은 문제 {DAILY_LIMIT - daily.count}개</strong>
          <p>{daily.count >= DAILY_LIMIT ? '오늘의 복습을 마쳤어요! 한국 시간 자정부터 다시 풀 수 있어요.' : '정답 XP +10 · 오답 XP −5 (최저 0). 정답·오답 모두 1문제를 사용해요. 한국 시간 자정에 새로 시작해요.'}</p>
        </div>
        <div className="actions">
          {Object.entries(actions).map(([action, label], index) => <button
            key={action} className={action} disabled={pending || daily.count >= DAILY_LIMIT || isActionResting(state.pet, action, now)} aria-describedby={isActionResting(state.pet, action, now) ? 'sleep-note' : undefined}
            onClick={event => { trigger.current = event.currentTarget; openQuiz(action); }}
          ><span>{['🍙', '🧹', '🧸'][index]}</span><strong>{label}</strong><small>{isActionResting(state.pet, action, now) ? '낮잠 중 · 잠시 쉬어요' : '정답이면 +15'}</small></button>)}
        </div>
        <div className="care-panel">
          <button onClick={() => performUpdate(options => updateStored(state, basicCare, options), health.sick ? '간호 기록을 남겼어요. 회복 조건을 확인해 주세요.' : '오늘도 곁에서 돌봐 줬어요!')} disabled={pending || !health.canCare}>
            {!health.canCare ? (daily.nursingDone ? '✓ 오늘 간호 완료' : '✓ 오늘 기본 돌봄 완료') : health.sick ? '♡ 간호하기' : '♡ 기본 돌봄 하기'}
          </button>
          <p>하루 한 번, 문제를 풀지 않아도 돌볼 수 있어요.<br />XP와 상태 수치는 바뀌지 않아요.<br />{stage.next ? '성장에 필요한 돌본 날짜를 채우고 건강을 돌봐요.' : '오늘 함께한 돌봄을 기록하고 건강을 돌봐요.'}</p>
        </div>
        <ul className="care-checklist" aria-label="오늘의 돌봄 체크리스트">
          {Object.entries(actions).map(([action, label]) => <li key={action}>{daily.careActions.includes(action) ? '✓ 완료' : '○ 아직'} · {label}</li>)}
          <li>{daily.careDone ? '✓ 완료' : '○ 아직'} · {daily.nursingDone ? '간호' : '기본 돌봄 / 간호'}</li>
        </ul>
        <p className="hint">✦ 코딩 문제 하나, 쑥쑥 자라는 우리 펫</p>
      </section>}
      <div className="learning-note"><span>✎</span><div><strong>매번 새로운 작은 도전</strong><p>6개 영역 · 30가지 문제 패턴으로 텍스트 기반 프로그래밍을 복습해요.</p></div></div>
      {notice && <p role="status" className="notice">{notice}</p>}
    </main>
    <footer>이 브라우저에 자동 저장돼요 · 계정 없이 즐기는 나만의 코딩 시간<br />사이트 데이터를 지우면 기록도 사라져요. 다른 기기와는 동기화되지 않아요.</footer>
    {state.quiz && <QuizModal quiz={state.quiz} pending={pending} limitReached={daily.count >= DAILY_LIMIT} sleepBlocked={isActionResting(state.pet,state.quiz.action,now)}
      onAnswer={answer => performUpdate(options => submitStored(state, answer, options))}
      onNext={() => openQuiz(state.quiz.action)} onClose={closeQuiz} />}
  </div>;
}
