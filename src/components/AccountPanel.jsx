import { useState } from 'react';
import { credentialError, PASSWORD_MIN } from '../game/account.js';

function PasswordField({ id, label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return <>
    <label htmlFor={id}>{label}</label>
    <div className="account-password">
      <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)} autoComplete={autoComplete} autoCapitalize="none" spellCheck="false" minLength={PASSWORD_MIN} maxLength={72} required />
      <button type="button" onClick={() => setVisible(!visible)} aria-pressed={visible} aria-controls={id} aria-label={visible ? `${label} 숨기기` : `${label} 보기`}>{visible ? '🙈' : '👁'}</button>
    </div>
  </>;
}

export default function AccountPanel({ account, busy = false, hasPet = false, petName = '', syncText = '', onLogin, onSignup, onLogout }) {
  const [mode, setMode] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  if (account.status === 'off') return null;
  if (account.status === 'checking') return <section className="account-panel" aria-label="계정"><p>계정 정보를 확인하고 있어요…</p></section>;
  if (account.user) return <section className="account-panel signed-in" aria-label="계정">
    <div><strong>✓ {account.user.username} 계정으로 로그인했어요</strong><p>{syncText || '계정에 자동 저장돼요. 다른 기기에서 로그인해도 이어서 키울 수 있어요.'}</p></div>
    <button disabled={busy} onClick={onLogout}>로그아웃</button>
  </section>;

  async function submit(event) {
    event.preventDefault();
    const problem = credentialError(username, password);
    if (problem) { setError(problem); return; }
    if (mode === 'signup' && password !== confirm) { setError('비밀번호 확인이 일치하지 않아요. 다시 입력해 주세요.'); return; }
    setError('');
    const failure = await (mode === 'signup' ? onSignup : onLogin)(username, password);
    if (failure) setError(failure);
    else { setMode(null); setPassword(''); setConfirm(''); }
  }
  const choose = next => { setMode(next); setError(''); setPassword(''); setConfirm(''); };

  return <section className="account-panel" aria-label="계정">
    {!mode ? <>
      <div><strong>{hasPet ? `${petName}의 기록을 계정에 보관할 수 있어요` : '계정이 있다면 로그인해서 이어서 키워요'}</strong>
        <p>{hasPet ? '회원가입하면 지금까지 이 브라우저에서 키운 펫을 그대로 이어서 저장해요.' : '로그인하면 다른 기기에서도 같은 펫을 키울 수 있어요.'}</p></div>
      <div className="account-actions">
        <button disabled={busy} onClick={() => choose('login')}>로그인</button>
        <button className="primary" disabled={busy} onClick={() => choose('signup')}>회원가입</button>
      </div>
    </> : <form className="account-form" onSubmit={submit} aria-busy={busy}>
      <h3>{mode === 'signup' ? '회원가입' : '로그인'}</h3>
      {mode === 'signup' && <p>{hasPet ? `지금 키우는 ${petName}의 XP·성장 단계·기록을 그대로 계정에 옮겨요.` : '가입한 뒤 펫을 만들면 계정에 저장돼요.'} 이메일은 받지 않아요.</p>}
      <label htmlFor="account-id">아이디</label>
      <input id="account-id" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck="false" maxLength={20} required />
      <small>영어 소문자로 시작, 영어 소문자·숫자·밑줄 4~20자. 실명·학번·전화번호는 쓰지 마세요.</small>
      <PasswordField id="account-password" label="비밀번호" value={password} onChange={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
      {mode === 'signup' && <>
        <small>{PASSWORD_MIN}자 이상. 잊어버리면 선생님께 재설정을 부탁해야 해요.</small>
        <PasswordField id="account-password-confirm" label="비밀번호 확인" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {confirm && <small className={`account-match ${confirm === password ? 'ok' : 'no'}`} role="status">{confirm === password ? '✓ 비밀번호가 같아요' : '✕ 비밀번호가 달라요'}</small>}
      </>}
      {error && <p className="account-error" role="alert">{error}</p>}
      <div className="account-actions">
        <button type="button" disabled={busy} onClick={() => choose(null)}>취소</button>
        <button className="primary" disabled={busy}>{busy ? '처리 중…' : mode === 'signup' ? '가입하고 이어서 키우기' : '로그인'}</button>
      </div>
    </form>}
  </section>;
}
