// Accounts use an ID and password only. The ID is turned into an internal
// address that never receives mail, so no student email is collected.
export const OWNER_KEY = 'coding-pet-account-v1';
export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{3,19}$/;
export const PASSWORD_MIN = 6;

export const normalizeUsername = value => String(value ?? '').trim().toLowerCase();
export const usernameToEmail = (username, domain) => `${normalizeUsername(username)}@${domain}`;
export const usernameFromEmail = email => String(email ?? '').split('@')[0];

export function credentialError(username, password) {
  if (!USERNAME_PATTERN.test(normalizeUsername(username))) return '아이디는 영어 소문자로 시작하고 영어 소문자·숫자·밑줄(_)로 4~20자여야 해요.';
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`;
  if (password.length > 72) return '비밀번호는 72자 이하로 정해 주세요.';
  return '';
}

export function authErrorMessage(error) {
  const code = error?.code ?? '';
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(error?.message ?? '')) return '이미 사용 중인 아이디예요. 다른 아이디를 골라 주세요.';
  if (code === 'invalid_credentials') return '아이디 또는 비밀번호가 맞지 않아요.';
  if (code === 'weak_password') return '비밀번호가 너무 쉬워요. 더 길게 정해 주세요.';
  if (error?.status === 429 || /rate_limit/.test(code)) return '요청이 많아요. 잠시 후 다시 시도해 주세요.';
  if (code === 'email_address_invalid' || code === 'email_address_not_authorized' || code === 'signup_disabled') return '회원가입 설정을 확인해야 해요. 선생님께 알려 주세요.';
  if (error?.name === 'TypeError' || /fetch/i.test(error?.message ?? '')) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
  return '로그인 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
}

const updatedAt = save => {
  const time = Date.parse(save?.lastUpdatedAt);
  return Number.isFinite(time) ? time : 0;
};

/**
 * Decide how this browser's save and the account's save are combined at login.
 * upload: keep this browser's pet in the account (also the guest → member path).
 * download: continue the account's pet here. ask: two different pets, let the player choose.
 */
export function resolveLogin({ localSave, localOwner, cloudSave, userId, syncedAt, acted = false, rev }) {
  if (!cloudSave) return localSave ? 'upload' : 'none';
  if (!localSave) return 'download';
  if (localOwner === userId) {
    // Time-based updates alone must not overwrite progress made on another device.
    if (cloudChangedElsewhere(cloudSave, syncedAt, rev) && !acted) return 'download';
    return updatedAt(localSave) > updatedAt(cloudSave) ? 'upload' : 'download';
  }
  const { lastUpdatedAt: _a, ...local } = localSave, { lastUpdatedAt: _b, ...cloud } = cloudSave;
  return JSON.stringify(local) === JSON.stringify(cloud) ? 'download' : 'ask';
}

// Key-sorted JSON, so the same save gives the same text even after the database reorders its keys.
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(item => stableStringify(item === undefined ? null : item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
// Short fingerprint of a save's content (FNV-1a), used to notice another device's write
// without trusting either device's clock.
export function saveRev(save) {
  if (!save) return '';
  const text = stableStringify(save);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
  return `${(hash >>> 0).toString(16)}-${text.length.toString(16)}`;
}

// Another device wrote after our last sync, so pushing now would overwrite its progress.
// With the fingerprint of the last synced save, any different account save counts as another
// device's write; device clocks often differ (school tablet vs. phone), so the timestamp is only a fallback.
export function cloudChangedElsewhere(cloudSave, syncedAt, rev) {
  if (!cloudSave) return false;
  if (rev) return saveRev(cloudSave) !== rev;
  return updatedAt(cloudSave) > (syncedAt ?? 0);
}

/**
 * One sync step while signed in. A newer save from another device is pulled in when
 * the player did nothing here since the last sync (time-based updates do not count);
 * when the player acted on both devices, the more recent save wins.
 */
export function syncAction({ localSave, cloudSave, syncedAt, localChanged, acted = false, rev }) {
  if (!cloudChangedElsewhere(cloudSave, syncedAt, rev)) return localChanged ? 'upload' : 'none';
  if (!localChanged || !acted) return 'download';
  return updatedAt(cloudSave) >= updatedAt(localSave) ? 'download' : 'upload';
}

// When another device's save replaces this one, keep today's questions already answered here
// so a download cannot hand the same questions out again. Returns the cloud save itself when nothing changes.
export function keepDailyProgress(cloudSave, localSave) {
  const cd = cloudSave?.daily, ld = localSave?.daily;
  if (!cd || !ld || cd.date !== ld.date || !((ld.answered ?? 0) > (cd.answered ?? 0))) return cloudSave;
  const daily = { ...cd, answered: ld.answered };
  if ((ld.period ?? 0) > (cd.period ?? 0) || ((ld.period ?? 0) === (cd.period ?? 0) && ld.count > cd.count)) {
    Object.assign(daily, { period: ld.period, count: ld.count, submittedIds: [...ld.submittedIds] });
  }
  const cq = cloudSave.quest, lq = localSave.quest;
  let quest = cq;
  if (cq && lq?.date === ld.date && (cq.date !== lq.date || lq.results.length > cq.results.length)) {
    const old = cq.date === lq.date ? cq.results : [];
    const extraStars = lq.results.slice(old.length).filter(Boolean).length;
    quest = { ...cq, date: lq.date, results: [...lq.results], stars: cq.stars + extraStars };
  }
  return { ...cloudSave, daily, quest };
}

// Which account this browser's save belongs to, the save time last synced, and whether
// the player acted here since then. Shared by all tabs of this browser so one tab's
// upload is not mistaken for another device.
export function readOwner(storage) {
  try {
    const value = JSON.parse((storage ?? globalThis.localStorage).getItem(OWNER_KEY));
    return value && typeof value.id === 'string' ? { id: value.id, syncedAt: Number.isFinite(value.syncedAt) ? value.syncedAt : 0, acted: value.acted === true, rev: typeof value.rev === 'string' && value.rev ? value.rev : undefined } : null;
  } catch { return null; }
}
export function writeOwner(id, syncedAt, storage, acted = false, rev) {
  try { (storage ?? globalThis.localStorage).setItem(OWNER_KEY, JSON.stringify({ id, syncedAt, acted, rev })); } catch { /* sync still works for this tab */ }
}
// Records a player action (quiz, care, shop…) not yet synced to the account.
export function markActed(storage) {
  const owner = readOwner(storage);
  if (owner && !owner.acted) writeOwner(owner.id, owner.syncedAt, storage, true, owner.rev);
}
export function clearOwner(storage) {
  try { (storage ?? globalThis.localStorage).removeItem(OWNER_KEY); } catch { /* nothing to clear */ }
}
export const saveTime = updatedAt;
