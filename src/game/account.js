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
export function resolveLogin({ localSave, localOwner, cloudSave, userId }) {
  if (!cloudSave) return localSave ? 'upload' : 'none';
  if (!localSave) return 'download';
  if (localOwner === userId) return updatedAt(localSave) > updatedAt(cloudSave) ? 'upload' : 'download';
  const { lastUpdatedAt: _a, ...local } = localSave, { lastUpdatedAt: _b, ...cloud } = cloudSave;
  return JSON.stringify(local) === JSON.stringify(cloud) ? 'download' : 'ask';
}

// Another device wrote after our last sync, so pushing now would overwrite its progress.
export function cloudChangedElsewhere(cloudSave, syncedAt) {
  return Boolean(cloudSave) && updatedAt(cloudSave) > (syncedAt ?? 0);
}

/**
 * One sync step while signed in. A newer save from another device is pulled in when
 * this browser has nothing new; when both changed, the more recent save wins.
 */
export function syncAction({ localSave, cloudSave, syncedAt, localChanged }) {
  if (!cloudChangedElsewhere(cloudSave, syncedAt)) return localChanged ? 'upload' : 'none';
  if (!localChanged) return 'download';
  return updatedAt(cloudSave) >= updatedAt(localSave) ? 'download' : 'upload';
}

// Which account this browser's save belongs to, and the save time last synced.
// Shared by all tabs of this browser so one tab's upload is not mistaken for another device.
export function readOwner(storage) {
  try {
    const value = JSON.parse((storage ?? globalThis.localStorage).getItem(OWNER_KEY));
    return value && typeof value.id === 'string' ? { id: value.id, syncedAt: Number.isFinite(value.syncedAt) ? value.syncedAt : 0 } : null;
  } catch { return null; }
}
export function writeOwner(id, syncedAt, storage) {
  try { (storage ?? globalThis.localStorage).setItem(OWNER_KEY, JSON.stringify({ id, syncedAt })); } catch { /* sync still works for this tab */ }
}
export function clearOwner(storage) {
  try { (storage ?? globalThis.localStorage).removeItem(OWNER_KEY); } catch { /* nothing to clear */ }
}
export const saveTime = updatedAt;
