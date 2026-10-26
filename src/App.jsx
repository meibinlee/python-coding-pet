import { maintenanceRemaining } from './game/maintenance.js';
import { useEffect, useRef, useState } from 'react';
import Pet from './components/Pet.jsx';
import StatusBars from './components/StatusBars.jsx';
import CharacterSelector from './components/CharacterSelector.jsx';
import GrowthAlbum from './components/GrowthAlbum.jsx';
import Shop from './components/Shop.jsx';
import { GuideContent, GuideDialog, Tutorial } from './components/Guide.jsx';
import { isFull, fullRemaining, activeMood } from './game/meal.js';
import { trashCount, SICK_CAUSES, NEED_LABELS, RECOVER_NEED } from './game/needs.js';
import AccountPanel from './components/AccountPanel.jsx';
import { buyItem, equipItem } from './game/shop.js';
import { resolveLogin, cloudChangedElsewhere, syncAction, readOwner, writeOwner, clearOwner, saveTime } from './game/account.js';
import { cloudConfigured, cloudMessage, currentUser, signUp, signIn, signOut, fetchCloudSave, pushCloudSave, deleteCloudSave } from './game/cloud.js';
import { characterImage, characterFor } from './data/characters.js';
import { selectCharacter } from './game/album.js';
import QuizModal from './components/QuizModal.jsx';
import { nextQuestion } from './game/questions.js';
import { actions, growth, growthStatus, refreshGrowth, isRoomMessy } from './game/rules.js';
import { sleepStatus, isActionResting } from './game/sleep.js';
import { isOnVacation } from './game/vacation.js';
import { healthStatus } from './game/health.js';
import { currentDaily, nextQuizReset, nextResetLabel } from './game/time.js';
import { DAILY_LIMIT, submitStored, updateStored, basicCare, setVacation } from './game/daily.js';
import { SAVE_KEY, loadPet, savePet, resetPet, defaultPet, createPet, DEFAULT_PET_NAME, readSave, importSave, validateSave } from './game/storage.js';

const SAVE_WARNING = '자동 저장에 실패했어요. 이 창을 닫으면 기록이 사라질 수 있어요.';
const TUTORIAL_KEY = 'coding-pet-tutorial-v1';
function tutorialSeen() {
  try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; }
}

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
  const [showGuide, setShowGuide] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const reactionTimer = useRef(null);
  const pendingReaction = useRef(null);
  const history = useRef([]);
  const trigger = useRef(null);
  const submitting = useRef(false);
  const memoryOnly = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const startedRef = useRef(started);
  startedRef.current = started;
  const [account, setAccount] = useState(() => ({ status: cloudConfigured() ? 'checking' : 'off', user: null }));
  const [accountBusy, setAccountBusy] = useState(false);
  const [syncText, setSyncText] = useState('');
  const userRef = useRef(null);
  const lastPushed = useRef('');
  const [syncTick, setSyncTick] = useState(0);
  const pulledTick = useRef(0);
  const stage = growth(state.pet.totalXp, state.pet.level);
  const growthProgress = growthStatus(state.pet, now);
  const remainingTime = formatWait(growthProgress.remainingMs);
  const health = healthStatus(state.pet, now);
  const nap = sleepStatus(state.pet, now);
  const daily = currentDaily(state.pet, now);
  const onVacation = isOnVacation(state.pet);
  const mood = activeMood(state.pet, now);
  const cleaning = mood === 'clean', playing = mood === 'play';
  const full = isFull(state.pet, now);
  const feedRest = full ? `이제 배불러요! ${formatWait(fullRemaining(state.pet, now))} 후 다시 밥을 먹일 수 있어요.` : '낮잠 중에는 밥을 쉬어요. 청소나 놀이를 선택해 주세요.';

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
      timer = setTimeout(refresh, Math.min(30000, napTime > 0 ? napTime + 1 : 30000, healthTime > 0 ? healthTime + 1 : 30000, nextQuizReset(time) - time + 1, status.remainingMs > 0 ? status.remainingMs + 1 : 30000));
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

  useEffect(() => {
    if (!cloudConfigured()) return;
    let active = true;
    currentUser().then(async user => {
      if (!active) return;
      if (!user) { setAccount({ status: 'guest', user: null }); return; }
      try {
        if (await connect(user) === false) { await signOut(); signedOut(); }
      } catch (error) {
        // Keep a known owner signed in; the sync step re-checks the account before writing.
        if (readOwner()?.id === user.id) { userRef.current = user; setAccount({ status: 'user', user }); setSyncText(`${cloudMessage(error)} 이 브라우저에는 계속 저장돼요.`); }
        else { setAccount({ status: 'guest', user: null }); setNotice(cloudMessage(error)); }
      }
    }).catch(error => { if (active) { setAccount({ status: 'guest', user: null }); setNotice(cloudMessage(error)); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const user = account.user;
    if (!user || !started) return;
    const timer = setTimeout(async () => {
      // Skip while a quiz or update is open; the next state change retries.
      if (submitting.current || stateRef.current.quiz) return;
      const save = localPayload();
      const text = save && JSON.stringify(save);
      const localChanged = Boolean(save) && text !== lastPushed.current;
      // Unchanged here: only look for another device's progress when the window regains focus.
      const pull = syncTick !== pulledTick.current;
      pulledTick.current = syncTick;
      if (!save || (!localChanged && !pull)) return;
      try {
        const cloud = await fetchCloudSave(user.id);
        if (userRef.current?.id !== user.id || submitting.current || stateRef.current.quiz) return;
        if (cloud && JSON.stringify(cloud) === text) { markSynced(user, cloud); return; }
        const action = syncAction({ localSave: save, cloudSave: cloud && validateSave(cloud) ? cloud : null, syncedAt: readOwner()?.syncedAt, localChanged });
        if (action === 'download') {
          download(user, cloud);
          setNotice('다른 기기에서 진행한 더 최근 기록을 불러왔어요.');
          return;
        }
        if (action === 'none') return;
        await upload(user, save);
        setSyncText(`계정에 저장했어요 · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`);
      } catch (error) {
        setSyncText(`${cloudMessage(error)} 이 브라우저에는 계속 저장되고, 연결되면 다시 저장해요.`);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [state.pet, account.user, started, syncTick]);

  useEffect(() => {
    const bump = () => { if (document.visibilityState !== 'hidden') setSyncTick(tick => tick + 1); };
    window.addEventListener('focus', bump);
    document.addEventListener('visibilitychange', bump);
    return () => { window.removeEventListener('focus', bump); document.removeEventListener('visibilitychange', bump); };
  }, []);

  function localPayload() {
    if (!startedRef.current) return null;
    return (!memoryOnly.current && readSave()) || { ...stateRef.current.pet, lastUpdatedAt: new Date().toISOString() };
  }
  function markSynced(user, save) {
    lastPushed.current = JSON.stringify(save);
    writeOwner(user.id, saveTime(save));
  }
  async function upload(user, save) {
    await pushCloudSave(user.id, save);
    markSynced(user, save);
  }
  function download(user, save) {
    const result = importSave(save);
    if (!result) throw new Error('invalid save');
    markSynced(user, save);
    history.current = [];
    memoryOnly.current = !result.saved;
    setState({ pet: result.pet, quiz: null });
    setStarted(!result.isNew);
    setName(result.pet.petName);
    setCharacter(result.pet.characterId ?? 'chiikawa');
  }

  // Combines this browser's pet and the account's pet. Returns false when the player cancels.
  async function connect(user) {
    const cloud = await fetchCloudSave(user.id);
    const cloudSave = cloud && validateSave(cloud) ? cloud : null;
    const local = localPayload();
    let decision = resolveLogin({ localSave: local, localOwner: readOwner()?.id, cloudSave, userId: user.id });
    if (decision === 'ask') {
      if (window.confirm(`이 브라우저와 계정에 서로 다른 펫 기록이 있어요.\n· 이 브라우저: ${local.petName} (XP ${local.totalXp})\n· 계정: ${cloudSave.petName} (XP ${cloudSave.totalXp})\n\n[확인] 계정의 ${cloudSave.petName}을(를) 불러와요.\n[취소] 다른 선택지를 볼게요.`)) decision = 'download';
      else if (window.confirm(`이 브라우저의 ${local.petName}을(를) 계정에 저장할까요?\n계정에 있던 ${cloudSave.petName}의 기록은 사라져요.\n[취소] 로그인을 취소하고 두 기록을 그대로 둬요.`)) decision = 'upload';
      else return false;
    }
    if (decision === 'download') download(user, cloudSave);
    else if (decision === 'upload') await upload(user, local);
    else { lastPushed.current = ''; writeOwner(user.id, 0); }
    userRef.current = user;
    setAccount({ status: 'user', user });
    setSyncText('');
    return decision;
  }

  async function login(username, password) {
    if (submitting.current) return '잠시 후 다시 시도해 주세요.';
    setAccountBusy(true);
    let user = null;
    try {
      user = await signIn(username, password);
      const decision = await connect(user);
      if (decision === false) { await signOut(); return '로그인을 취소했어요. 두 기록 모두 그대로예요.'; }
      setNotice(decision === 'download' ? `${user.username} 계정의 펫을 불러왔어요. 이어서 함께해요!` : decision === 'upload' ? '이 브라우저의 펫을 계정에 저장했어요.' : '로그인했어요. 펫을 만들면 계정에 자동 저장돼요.');
      return '';
    } catch (error) {
      if (user) await signOut().catch(() => {});
      return cloudMessage(error);
    } finally { setAccountBusy(false); }
  }

  async function signup(username, password) {
    if (submitting.current) return '잠시 후 다시 시도해 주세요.';
    setAccountBusy(true);
    try {
      const user = await signUp(username, password);
      // Guest progress in this browser becomes the new account's first save.
      const local = localPayload();
      userRef.current = user;
      writeOwner(user.id, 0);
      lastPushed.current = '';
      setAccount({ status: 'user', user });
      try {
        if (local) await upload(user, local);
        setNotice(local ? `가입 완료! 지금까지 키운 ${local.petName}의 기록을 ${user.username} 계정에 저장했어요.` : '가입 완료! 펫을 만들면 계정에 자동 저장돼요.');
        // Players who kept a browser-only pet see the tutorial once more with their saved progress.
        if (local) setShowTutorial(true);
      } catch (error) {
        setNotice(`가입은 완료했지만 기록 저장에 실패했어요. ${cloudMessage(error)} 자동으로 다시 저장해요.`);
      }
      return '';
    } catch (error) {
      return cloudMessage(error);
    } finally { setAccountBusy(false); }
  }

  function signedOut() {
    userRef.current = null;
    lastPushed.current = '';
    setAccount({ status: 'guest', user: null });
    setSyncText('');
  }

  async function logout() {
    const user = userRef.current;
    if (!user || submitting.current || !window.confirm('로그아웃할까요? 펫 기록을 계정에 저장한 뒤 이 브라우저에서는 지워요. 다시 로그인하면 이어서 키울 수 있어요.')) return;
    setAccountBusy(true);
    try {
      const save = localPayload();
      if (save && JSON.stringify(save) !== lastPushed.current && !cloudChangedElsewhere(await fetchCloudSave(user.id), readOwner()?.syncedAt)) await upload(user, save);
      await signOut();
      resetPet();
      clearOwner();
      signedOut();
      clearGame();
      setNotice('로그아웃했어요. 다시 로그인하면 이어서 키울 수 있어요.');
    } catch (error) {
      setNotice(`${cloudMessage(error)} 기록을 지키기 위해 로그아웃하지 않았어요.`);
    } finally { setAccountBusy(false); }
  }

  function clearGame() {
    setStarted(false);
    setName(DEFAULT_PET_NAME);
    history.current = [];
    clearTimeout(reactionTimer.current);
    pendingReaction.current = null;
    setCharacter('chiikawa');
    setState({ pet: defaultPet(), quiz: null });
  }

  function buy(item) {
    if (!window.confirm(`${item.name}을(를) ${item.price} XP로 구입할까요?\n구입하면 바로 입혀 줘요. 성장 단계는 그대로예요.`)) return;
    performUpdate(options => updateStored(state, current => buyItem(current, item.id), options),
      `${item.name}을(를) 구입해서 입혀 줬어요!`, 'XP가 부족하거나 이미 가진 물건이에요. 현재 상태를 확인해 주세요.');
  }

  function equip(slot, itemId) {
    performUpdate(options => updateStored(state, current => equipItem(current, slot, itemId), options),
      itemId ? '새로 입혀 줬어요!' : '벗겨 줬어요.', '이미 바뀌었어요. 현재 상태를 확인해 주세요.');
  }

  async function performUpdate(update, successMessage = '', blockedMessage = '이미 처리한 행동이거나 지금 풀 수 있는 문제를 모두 풀었어요.') {
    if (submitting.current) return null;
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
      return result;
    } catch {
      setNotice('처리하지 못했어요. 잠시 후 다시 눌러 주세요.');
      return null;
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  async function answer(choice) {
    const wasFull = isFull(state.pet, Date.now());
    const result = await performUpdate(options => submitStored(state, choice, options));
    const quiz = result?.state.quiz;
    // The second meal fills the pet: show the result briefly, then close the quiz.
    if (result && !result.blocked && quiz?.correct && quiz.action === 'hunger' && !wasFull && isFull(result.state.pet, Date.now())) {
      if (result.saved) setNotice(`이제 배불러요! ${formatWait(fullRemaining(result.state.pet, Date.now()))} 후에 다시 밥을 먹일 수 있어요.`);
      clearTimeout(reactionTimer.current);
      reactionTimer.current = setTimeout(closeQuiz, 2000);
    }
  }

  function closeTutorial() {
    setShowTutorial(false);
    try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* shows again next time */ }
  }
  function openTutorial() { setShowGuide(false); setShowTutorial(true); }

  function start(event) {
    event.preventDefault();
    const pet = createPet(name,character);
    const saved = savePet(pet);
    memoryOnly.current = !saved;
    if (!saved) setNotice(SAVE_WARNING);
    setState(current => ({ ...current, pet }));
    setStarted(true);
    if (!tutorialSeen()) setShowTutorial(true);
  }

  function openQuiz(action) {
    const time = Date.now();
    setNow(time);
    if (isOnVacation(state.pet)) {
      setNotice('휴가를 마친 뒤 문제와 돌봄을 이어갈 수 있어요.');
      return;
    }
    if (isActionResting(state.pet, action, time)) {
      setNotice(feedRest);
      return;
    }
    if (currentDaily(state.pet, time).count >= DAILY_LIMIT) {
      setNotice(`오늘의 복습이 끝났어요! ${nextResetLabel(time)}에 다시 만나요.`);
      return;
    }
    const question = nextQuestion(history.current);
    history.current = [...history.current, question].slice(-5);
    setState(current => ({ ...current, quiz: { question, action, answered: false } }));
  }

  function closeQuiz() {
    if (submitting.current) return;
    clearTimeout(reactionTimer.current);
    if (pendingReaction.current) {
      const kind = pendingReaction.current;
      pendingReaction.current = null;
      if (!memoryOnly.current) setNotice(kind === 'clean' ? '청소 완료! 한동안 반짝반짝 깨끗한 모습이에요.' : '함께 신나게 놀았어요! 한동안 신난 모습이에요.');
    }
    setState(current => ({ ...current, quiz: null }));
    requestAnimationFrame(() => {
      // The original action may be disabled after the tenth question.
      if (trigger.current?.disabled) document.querySelector('.care-panel button:not(:disabled), .reset')?.focus();
      else trigger.current?.focus();
    });
  }

  async function reset() {
    const user = userRef.current;
    if (submitting.current || !window.confirm(user ? '펫과 모든 학습 기록을 초기화할까요?\n계정에 저장된 기록도 함께 지워져요.' : '펫과 모든 학습 기록을 초기화할까요?')) return;
    submitting.current = true;
    setPending(true);
    try {
      if (user) {
        await deleteCloudSave(user.id);
        lastPushed.current = '';
        writeOwner(user.id, 0);
      }
      const locks = globalThis.navigator?.locks;
      const ok = locks?.request ? await locks.request('coding-pet-save', () => resetPet()) : resetPet();
      memoryOnly.current = !ok;
      clearGame();
      setNotice(ok ? '' : '저장소 기록을 삭제하지 못했어요. 브라우저의 사이트 데이터 설정을 확인해 주세요.');
    } catch (error) {
      setNotice(user ? `${cloudMessage(error)} 초기화하지 않았어요.` : '초기화하지 못했어요. 잠시 후 다시 눌러 주세요.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  const trash = started && state.pet.characterId ? trashCount(state.pet.cleanliness) : 0;

  return <div className="app">
    <header>
      <a href="./" className="brand"><img className="brand-icon" src={`${import.meta.env.BASE_URL}favicon.svg?v=rabbit1`} width="38" height="38" alt="" /> 코딩 펫 <span className="brand-sub">작은 도전, 함께 자라는 하루</span></a>
      <div className="header-actions">
        <button className="guide-open" onClick={() => setShowGuide(true)}>📖 사용방법</button>
        <button className="reset" disabled={pending || accountBusy} onClick={reset}>↻ 초기화</button>
      </div>
    </header>
    <div className="layout">
    <main>
      <div className="intro">
        <span className="eyebrow">MY LITTLE CODING FRIEND</span>
        <h1>파이썬 타마고치</h1>
        <p>문제를 풀고, 나만의 작은 친구를 돌봐요.</p>
      </div>
      <AccountPanel account={account} busy={accountBusy || pending} hasPet={started} petName={state.pet.petName} syncText={syncText} onLogin={login} onSignup={signup} onLogout={logout} />
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
        <Pet pet={state.pet} stage={stage} sick={health.sick} sickMessage={health.cause ? SICK_CAUSES[health.cause] : ''} sleeping={nap.sleeping} full={full} messy={isRoomMessy(state.pet)} trash={trash} cleaning={cleaning} playing={playing} vacation={onVacation} limitReached={daily.count >= DAILY_LIMIT} />
        <ul className="pet-status" role="status">
          {onVacation && <li>☀ 휴가 중 · 모든 시간이 멈췄어요</li>}
          {nap.sleeping && <li id="sleep-note">☾ 낮잠 중 · 약 {formatWait(nap.remainingMs)} 뒤에 깨요</li>}
          {full && <li id="full-note">🍙 이제 배불러요! {formatWait(fullRemaining(state.pet, now))} 후 다시 밥 먹이기</li>}
          {trash > 0 && <li>🧹 주변에 쓰레기 {trash}개 · 청소하면 줄어요</li>}
          {isRoomMessy(state.pet) && <li>💩 치울 것이 생겼어요</li>}
          {cleaning && <li>✦ 깨끗하게 청소했어요</li>}
          {playing && <li>♥ 신나게 놀았어요</li>}
        </ul>
        {health.sick && <section className="health-details is-sick" aria-label="건강과 회복 상태" role="status">
          <h3>♡ {health.cause ? SICK_CAUSES[health.cause] : '조금 아파요'}</h3>
          <ul>
            <li>{health.recovering ? '✓' : '○'} 간호하기로 회복 시작</li>
            {health.recovering && <li>{health.remainingMs > 0 ? `○ 회복까지 ${formatWait(health.remainingMs)}` : '✓ 24시간 지남'}</li>}
            {health.recovering && <li>{health.needsFollowUp ? '○ 다른 날 한 번 더 간호' : '✓ 다른 날 간호 완료'}</li>}
            {health.cause && <li>{health.needsRefill ? '○' : '✓'} {NEED_LABELS[health.cause]} {RECOVER_NEED} 이상 채우기 (지금 {state.pet[health.cause]})</li>}
          </ul>
        </section>}
        <StatusBars pet={state.pet} canSicken={stage.level >= 2} />
        <div className="daily-summary" role="status"><strong>지금 {daily.count} / {DAILY_LIMIT}문제</strong>{daily.count >= DAILY_LIMIT ? <span> · 오늘의 복습이 끝났어요! {nextResetLabel(now)}에 다시 만나요</span> : <span> · {nextResetLabel(now)}에 새로 충전</span>}</div>
        <div className="actions">
          {Object.entries(actions).map(([action, label], index) => {
            const resting = isActionResting(state.pet, action, now);
            return <button
              key={action} className={action} disabled={pending || onVacation || daily.count >= DAILY_LIMIT || resting} aria-describedby={resting ? (full ? 'full-note' : 'sleep-note') : undefined}
              onClick={event => { trigger.current = event.currentTarget; openQuiz(action); }}
            ><span>{['🍙', '🧹', '🧸'][index]}</span><strong>{label}</strong><small>{onVacation ? '휴가 중' : resting ? (full ? `배불러요 · ${formatWait(fullRemaining(state.pet, now))} 후` : '낮잠 중') : '정답이면 +15'}</small></button>;
          })}
        </div>
        <div className="care-panel">
          <button onClick={() => performUpdate(options => updateStored(state, basicCare, options), health.sick ? '간호 기록을 남겼어요. 회복 조건을 확인해 주세요.' : '오늘도 곁에서 돌봐 줬어요!')} disabled={pending || !health.canCare}>
            {onVacation ? '☀ 휴가 중에는 돌봄을 쉬어요' : !health.canCare ? (daily.nursingDone ? '✓ 오늘 간호 완료' : '✓ 오늘 기본 돌봄 완료') : health.sick ? '♡ 간호하기' : '♡ 기본 돌봄 하기'}
          </button>
          <ul className="care-checklist" aria-label="오늘의 돌봄 체크리스트">
            {Object.entries(actions).map(([action, label]) => <li key={action}>{daily.careActions.includes(action) ? '✓' : '○'} {label}</li>)}
            <li>{daily.careDone ? '✓' : '○'} {daily.nursingDone ? '간호' : '기본 돌봄'}</li>
          </ul>
        </div>
        {stage.next && <details className="growth-details" aria-label="다음 성장 조건">
          <summary>{stage.level === 1 ? '아기' : '성체'}가 되려면 · {[growthProgress.xpRemaining === 0, growthProgress.remainingMs === 0, growthProgress.careDays >= stage.days].filter(Boolean).length}/3 달성</summary>
          <ul>
            <li>{growthProgress.xpRemaining === 0 ? '✓' : '○'} 경험치 {state.pet.totalXp} / {stage.next} XP</li>
            <li>{growthProgress.remainingMs === 0 ? '✓' : `○ ${remainingTime} 남음 ·`} {stage.level === 1 ? '육성 시작 후 48시간' : '아기가 된 뒤 96시간'}</li>
            <li>{growthProgress.careDays >= stage.days ? '✓' : '○'} 돌본 날짜 {Math.min(growthProgress.careDays,stage.days)} / {stage.days}일</li>
            <li>XP 감소까지 · {Object.entries(actions).map(([action,label]) => `${label.split(' ')[0]} ${formatWait(maintenanceRemaining(state.pet,action,now))}`).join(' · ')}</li>
          </ul>
        </details>}
        <section className={`vacation-panel${onVacation ? ' on-vacation' : ''}`} aria-label="휴가 모드">
          <p id="vacation-note">{onVacation ? '☀ 휴가 중이에요. 문제와 돌봄은 휴가를 마친 뒤 이어가요.' : '오래 비울 때는 휴가를 켜 두세요.'}</p>
          <button disabled={pending} aria-pressed={onVacation} onClick={() => performUpdate(
            options => updateStored(state,(current,time) => setVacation(current,!onVacation,time),options),
            onVacation ? '휴가를 마쳤어요. 남아 있던 시간부터 다시 함께해요.' : '휴가를 시작했어요. 편안히 다녀오세요!',
            '이미 휴가 상태가 바뀌었어요. 현재 상태를 확인해 주세요.'
          )}>{onVacation ? '휴가 마치기' : '휴가 시작하기'}</button>
        </section>
        <Shop pet={state.pet} pending={pending || accountBusy} onBuy={buy} onEquip={equip} />
        <GrowthAlbum pet={state.pet} />
      </section>}
      {notice && <p role="status" className="notice">{notice}</p>}
    </main>
    <aside className="guide-aside" aria-labelledby="guide-aside-title">
      <h2 id="guide-aside-title">📖 사용방법</h2>
      <GuideContent onTutorial={openTutorial} />
    </aside>
    </div>
    <footer>{account.user ? <>{account.user.username} 계정과 이 브라우저에 자동 저장돼요<br /></> : <>이 브라우저에 자동 저장돼요{account.status === 'off' ? '' : ' · 로그인하면 다른 기기에서도 이어서 키워요'}<br /></>}<span className="credit">by.meibinlee</span></footer>
    {state.quiz && <QuizModal quiz={state.quiz} pending={pending} limitReached={daily.count >= DAILY_LIMIT} resetLabel={nextResetLabel(now)} sleepBlocked={isActionResting(state.pet,state.quiz.action,now)} restMessage={feedRest} vacationBlocked={onVacation}
      onAnswer={answer} onNext={() => openQuiz(state.quiz.action)} onClose={closeQuiz} />}
    {showGuide && <GuideDialog onClose={() => setShowGuide(false)} onTutorial={openTutorial} />}
    {showTutorial && !state.quiz && <Tutorial onClose={closeTutorial} />}
  </div>;
}
