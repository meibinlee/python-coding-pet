import { maintenanceRemaining } from './game/maintenance.js';
import { useEffect, useRef, useState } from 'react';
import Pet from './components/Pet.jsx';
import StatusBars from './components/StatusBars.jsx';
import CharacterSelector from './components/CharacterSelector.jsx';
import GrowthAlbum from './components/GrowthAlbum.jsx';
import { characterImage, characterFor } from './data/characters.js';
import { selectCharacter } from './game/album.js';
import QuizModal from './components/QuizModal.jsx';
import { nextQuestion } from './game/questions.js';
import { actions, growth, growthStatus, refreshGrowth, isRoomMessy } from './game/rules.js';
import { sleepStatus, isActionResting } from './game/sleep.js';
import { isOnVacation } from './game/vacation.js';
import { healthStatus } from './game/health.js';
import { currentDaily, nextKoreanMidnight } from './game/time.js';
import { DAILY_LIMIT, submitStored, updateStored, basicCare, setVacation } from './game/daily.js';
import { SAVE_KEY, loadPet, savePet, resetPet, defaultPet, createPet, DEFAULT_PET_NAME } from './game/storage.js';

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
  const [character, setCharacter] = useState(loaded.pet.characterId ?? 'chiikawa');
  const [notice, setNotice] = useState(loaded.error);
  const [now, setNow] = useState(Date.now);
  const [pending, setPending] = useState(false);
  const [reaction, setReaction] = useState(null);
  const cleaning = reaction === 'clean';
  const playing = reaction === 'play';
  const reactionTimer = useRef(null);
  const pendingReaction = useRef(null);
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
  const onVacation = isOnVacation(state.pet);

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
      clearTimeout(reactionTimer.current);
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('storage', sync);
    };
  }, []);

  async function performUpdate(update, successMessage = '', blockedMessage = '이미 처리한 행동이거나 오늘의 횟수를 모두 사용했어요. 한국 시간 자정에 다시 만나요.') {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    try {
      const result = await update({ preferMemory: memoryOnly.current });
      setState(result.state);
      if (!result.blocked && result.state.quiz?.correct && ['cleanliness','affection'].includes(result.state.quiz.action)) pendingReaction.current = result.state.quiz.action === 'cleanliness' ? 'clean' : 'play';
      setNow(Date.now());
      if (!result.saved) {
        memoryOnly.current = true;
        setNotice(SAVE_WARNING);
      } else if (result.blocked && memoryOnly.current) {
        setNotice(SAVE_WARNING);
      } else if (result.blocked) {
        setNotice(blockedMessage);
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
    const pet = createPet(name,character);
    const saved = savePet(pet);
    memoryOnly.current = !saved;
    if (!saved) setNotice(SAVE_WARNING);
    setState(current => ({ ...current, pet }));
    setStarted(true);
  }

  function openQuiz(action) {
    const time = Date.now();
    setNow(time);
    if (isOnVacation(state.pet)) {
      setNotice('휴가를 마친 뒤 문제와 돌봄을 이어갈 수 있어요.');
      return;
    }
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
    if (pendingReaction.current) {
      const kind = pendingReaction.current;
      pendingReaction.current = null;
      clearTimeout(reactionTimer.current);
      setReaction(kind);
      reactionTimer.current = setTimeout(() => setReaction(null), 1800);
      if (!memoryOnly.current) setNotice(kind === 'clean' ? '청소 완료! 방을 깨끗하게 정리했어요.' : '함께 신나게 놀았어요!');
    }
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
      setName(DEFAULT_PET_NAME);
      history.current = [];
      clearTimeout(reactionTimer.current);
      setReaction(null);
      pendingReaction.current = null;
      setCharacter('chiikawa');
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
      <a href="./" className="brand"><img className="brand-icon" src={`${import.meta.env.BASE_URL}favicon.svg?v=rabbit1`} width="38" height="38" alt="" /> 코딩 펫 <span className="brand-sub">작은 도전, 함께 자라는 하루</span></a>
      <button className="reset" disabled={pending} onClick={reset}>↻ 초기화</button>
    </header>
    <main>
      <div className="intro">
        <span className="eyebrow">MY LITTLE CODING FRIEND</span>
        <h1>파이썬 타마고치</h1>
        <p>문제를 풀고, 나만의 작은 친구를 돌봐요.</p>
      </div>
      {!started ? <form className="welcome card" onSubmit={start}>
        <img src={characterImage(character,1,'normal',import.meta.env.BASE_URL)} alt={`${characterFor(character).name} 알 모습`} className="welcome-egg" />
        <h2>우리 처음 만났네!</h2>
        <CharacterSelector value={character} onChange={setCharacter} /><label htmlFor="pet-name">펫에게 이름을 지어 주세요</label>
        <input id="pet-name" maxLength={20} value={name} onChange={event => setName(event.target.value)} autoComplete="off" />
        <p>학생 이름 대신 펫 이름만 입력해 주세요.</p>
        <button className="primary">함께 시작하기 →</button>
      </form> : !state.pet.characterId ? <section className="card welcome" aria-label="기존 펫의 친구 선택">
        <h2>{state.pet.petName}의 모습을 골라 주세요</h2>
        <p>기존 XP {state.pet.totalXp}와 성장 단계·돌봄 기록을 그대로 유지해요.</p>
        <CharacterSelector value={character} onChange={setCharacter} disabled={pending} />
        <button className="primary" disabled={pending} onClick={() => performUpdate(options=>updateStored(state,current=>selectCharacter(current,character),options),'선택한 친구와 계속 함께해요!','다른 창에서 이미 친구를 선택했어요. 그 친구와 계속 함께해요.')}>이 친구와 계속하기</button>
      </section> : <section className="card pet-card" aria-label="나의 펫">
        <div className="pet-heading">
          <div><span className="tag">Lv.{stage.level} · {stage.name}</span><h2>{state.pet.petName}<span className="tiny-heart"> ♥</span></h2></div>
          <div className="xp">
            <span>성장 경험치</span>
            <strong>{state.pet.totalXp} <small>{stage.next ? `/ ${stage.next} XP` : 'XP · 최고 단계'}</small></strong>
            <progress aria-label="성장 경험치" max={stage.next ? stage.next - stage.start : 1} value={stage.next ? Math.min(stage.next - stage.start, Math.max(0, state.pet.totalXp - stage.start)) : 1} />
          </div>
        </div>
        <section className={`vacation-panel${onVacation ? ' on-vacation' : ''}`} aria-label="휴가 모드">
          <div><h3>{onVacation ? '☀ 함께 쉬는 휴가 중이에요' : '잠깐 쉬어 가고 싶나요?'}</h3>
            <p id="vacation-note">{onVacation ? '질병·성장·회복·XP 감소 시간이 멈췄어요. 문제 풀이와 돌봄은 휴가를 마친 뒤 이어가요. 쓰다듬기는 언제든 가능해요.' : '여행이나 주말에는 휴가 모드로 질병·성장·회복·XP 감소 시간을 함께 멈출 수 있어요.'}</p>
            {onVacation && <p>일일 문제 수는 한국 날짜를 따르며 이월되지 않아요. 낮잠은 원래 종료 시각에 끝나요.</p>}
          </div>
          <button disabled={pending} aria-pressed={onVacation} onClick={() => performUpdate(
            options => updateStored(state,(current,time) => setVacation(current,!onVacation,time),options),
            onVacation ? '휴가를 마쳤어요. 남아 있던 시간부터 다시 함께해요.' : '휴가를 시작했어요. 편안히 다녀오세요!',
            '이미 휴가 상태가 바뀌었어요. 현재 상태를 확인해 주세요.'
          )}>{onVacation ? '휴가 마치기' : '휴가 시작하기'}</button>
        </section>
        <Pet pet={state.pet} stage={stage} sick={health.sick} sleeping={nap.sleeping} messy={isRoomMessy(state.pet)} cleaning={cleaning} playing={playing} vacation={onVacation} limitReached={daily.count >= DAILY_LIMIT} />
        <div className="pet-caption">{stage.next ? '경험치와 함께한 시간이 모이면 성장해요.' : '멋진 친구로 자랐어요! 계속 함께해요.'}</div>
        <p className="room-status" role="status">{onVacation ? '방 정리도 휴가를 마친 뒤 이어갈 수 있어요.' : cleaning ? '✦ 청소 완료! 방이 반짝반짝해요.' : isRoomMessy(state.pet) ? '방에 치울 것이 생겼어요. 청소 문제를 맞혀 함께 정리해요!' : '방이 깔끔해요. 먹이 정답 2번마다 치울 것이 생겨요.'}</p>
        {nap.sleeping && <section className="sleep-details" aria-label="낮잠 상태" role="status">
          <h3>☾ 배불러서 낮잠 자는 중이에요</h3>
          <p>약 {formatWait(nap.remainingMs)} 뒤에 깨어나요. 새로고침해도 같은 시간에 일어나요.</p>
          <p id="sleep-note">{onVacation ? '휴가 중에도 낮잠은 원래 종료 시각에 끝나요. 문제와 돌봄은 휴가를 마친 뒤 이어가요.' : '먹이는 잠시 쉬고 청소·놀이 문제를 풀어 주세요. 기본 돌봄과 간호도 가능해요.'}</p>
          {health.sick && !onVacation && <p>자는 동안에도 간호가 필요해요. 아래 회복 조건을 함께 확인해 주세요.</p>}
        </section>}
        {stage.level >= 2 && <section className={`health-details${health.sick ? ' is-sick' : ''}`} aria-label="건강과 회복 상태" role="status">
          <h3>{health.sick ? (health.recovering ? '♡ 함께 회복하는 중이에요' : '♡ 조금 아파요. 하루 동안 함께 보살펴 주세요.') : '✓ 편안하게 지내고 있어요'}</h3>
          {onVacation && <p>휴가 중에는 질병과 회복의 경과시간이 멈춰요. 간호는 휴가를 마친 뒤 이어갈 수 있어요.</p>}
          {health.sick ? <>
            <p>{health.recovering ? '첫 간호부터 실제 24시간과 다른 한국 날짜의 추가 간호가 모두 필요해요.' : '간호하기를 눌러 회복을 시작해 주세요. 첫 간호부터 실제 24시간과 다른 한국 날짜의 추가 간호가 필요해요.'}</p>
            {health.recovering && <ul>
              <li>{health.remainingMs > 0 ? `○ 회복까지 ${formatWait(health.remainingMs)} 남았어요` : '✓ 회복 시간 24시간을 채웠어요'}</li>
              <li>{health.needsFollowUp ? '○ 첫 간호와 다른 한국 날짜에 한 번 더 간호해 주세요' : '✓ 다른 날짜의 추가 간호를 기록했어요'}</li>
            </ul>}
            {!onVacation && health.extraNursing && <p>오늘 기본 돌봄을 마쳤어도 회복을 시작하는 첫 간호는 할 수 있어요.</p>}
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
          <p>{onVacation ? '휴가 중에는 성장 시간과 돌본 날짜가 쌓이지 않아요. ' : ''}{health.sick ? '아픈 동안은 성장 대기 중이에요. 회복 후 조건을 다시 확인해요. ' : ''}세 조건을 모두 채우면 성장해요. 정답 돌봄 또는 기본 돌봄으로 하루를 기록해요. 오답·쓰다듬기는 돌본 날짜에 포함되지 않아요.</p>
        </section>}
        {stage.next && <section className="growth-details" aria-label="주기적인 돌봄">
          <h3>4시간마다 함께 돌봐요</h3>
          <p>먹이·청소·놀이를 각각 4시간 동안 하지 않으면 해당 행동마다 성장 XP가 1씩 줄어요. 정답을 맞히면 그 행동의 관리 시간이 새로 시작돼요.</p>
          <ul>{Object.entries(actions).map(([action,label]) => <li key={action}>{label} · 다음 감소까지 {formatWait(maintenanceRemaining(state.pet,action,now))}</li>)}</ul>
          <p>{onVacation ? '휴가 중에는 XP 감소 시간도 멈춰요.' : '접속하지 않은 시간과 낮잠 시간도 포함돼요. 오래 쉬려면 휴가를 시작해 주세요.'} XP는 최저 0이며 성장 단계는 내려가지 않아요. 성체가 되면 주기적인 XP 감소가 끝나요.</p>
          <p>기본 돌봄·간호·쓰다듬기는 이 시간을 초기화하지 않아요. 하루 문제 한도 내에서 돌봐 주세요.</p>
        </section>}
        <StatusBars pet={state.pet} />
        <div className="daily-summary" role="status">
          <strong>오늘 {daily.count} / {DAILY_LIMIT}문제 · 남은 문제 {DAILY_LIMIT - daily.count}개</strong>
          <p>{onVacation ? '휴가 중에는 문제를 제출하지 않아요. 남은 횟수는 다음 날로 이월되지 않아요.' : daily.count >= DAILY_LIMIT ? '오늘의 복습을 마쳤어요! 한국 시간 자정부터 다시 풀 수 있어요.' : '정답 XP +10 · 오답 XP −5 (최저 0). 정답·오답 모두 1문제를 사용해요. 한국 시간 자정에 새로 시작해요.'}</p>
        </div>
        <div className="actions">
          {Object.entries(actions).map(([action, label], index) => <button
            key={action} className={action} disabled={pending || onVacation || daily.count >= DAILY_LIMIT || isActionResting(state.pet, action, now)} aria-describedby={onVacation ? 'vacation-note' : isActionResting(state.pet, action, now) ? 'sleep-note' : undefined}
            onClick={event => { trigger.current = event.currentTarget; openQuiz(action); }}
          ><span>{['🍙', '🧹', '🧸'][index]}</span><strong>{label}</strong><small>{onVacation ? '휴가 중' : isActionResting(state.pet, action, now) ? '낮잠 중 · 잠시 쉬어요' : '정답이면 +15'}</small></button>)}
        </div>
        <div className="care-panel">
          <button onClick={() => performUpdate(options => updateStored(state, basicCare, options), health.sick ? '간호 기록을 남겼어요. 회복 조건을 확인해 주세요.' : '오늘도 곁에서 돌봐 줬어요!')} disabled={pending || !health.canCare}>
            {onVacation ? '☀ 휴가 중에는 돌봄을 쉬어요' : !health.canCare ? (daily.nursingDone ? '✓ 오늘 간호 완료' : '✓ 오늘 기본 돌봄 완료') : health.sick ? '♡ 간호하기' : '♡ 기본 돌봄 하기'}
          </button>
          <p>하루 한 번, 문제를 풀지 않아도 돌볼 수 있어요.<br />XP와 상태 수치는 바뀌지 않아요.<br />{stage.next ? '성장에 필요한 돌본 날짜를 채우고 건강을 돌봐요.' : '오늘 함께한 돌봄을 기록하고 건강을 돌봐요.'}</p>
        </div>
        <ul className="care-checklist" aria-label="오늘의 돌봄 체크리스트">
          {Object.entries(actions).map(([action, label]) => <li key={action}>{daily.careActions.includes(action) ? '✓ 완료' : '○ 아직'} · {label}</li>)}
          <li>{daily.careDone ? '✓ 완료' : '○ 아직'} · {daily.nursingDone ? '간호' : '기본 돌봄 / 간호'}</li>
        </ul>
        <GrowthAlbum pet={state.pet} />
        <p className="hint">✦ 코딩 문제 하나, 쑥쑥 자라는 우리 펫</p>
      </section>}
      <div className="learning-note"><span>✎</span><div><strong>매번 새로운 작은 도전</strong><p>6개 영역 · 30가지 문제 패턴으로 텍스트 기반 프로그래밍을 복습해요.</p></div></div>
      {notice && <p role="status" className="notice">{notice}</p>}
    </main>
    <footer>이 브라우저에 자동 저장돼요 · 계정 없이 즐기는 나만의 코딩 시간<br />사이트 데이터를 지우면 기록도 사라져요. 다른 기기와는 동기화되지 않아요.<br /><span className="credit">by.meibinlee</span></footer>
    {state.quiz && <QuizModal quiz={state.quiz} pending={pending} limitReached={daily.count >= DAILY_LIMIT} sleepBlocked={isActionResting(state.pet,state.quiz.action,now)} vacationBlocked={onVacation}
      onAnswer={answer => performUpdate(options => submitStored(state, answer, options))}
      onNext={() => openQuiz(state.quiz.action)} onClose={closeQuiz} />}
  </div>;
}
