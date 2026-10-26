import { usernameToEmail, usernameFromEmail, authErrorMessage } from './account.js';

// Public project URL and anon key only; row level security limits each player to their own row.
const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DOMAIN = import.meta.env.VITE_LOGIN_EMAIL_DOMAIN || 'students.coding-pet.app';
const TABLE = 'pet_saves';
export const cloudConfigured = () => Boolean(URL && KEY);

let clientPromise = null;
function client() {
  // Loaded only when login is configured, so the local-only build stays small.
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'coding-pet-auth' },
  }));
  return clientPromise;
}

class CloudError extends Error {}
const fail = error => { throw new CloudError(authErrorMessage(error)); };
const toUser = user => user && { id: user.id, username: user.user_metadata?.username ?? usernameFromEmail(user.email) };
export const cloudMessage = error => error instanceof CloudError ? error.message : authErrorMessage(error);

export async function currentUser() {
  const { data, error } = await (await client()).auth.getSession();
  if (error) fail(error);
  return toUser(data.session?.user ?? null);
}

export async function signUp(username, password) {
  const { data, error } = await (await client()).auth.signUp({ email: usernameToEmail(username, DOMAIN), password, options: { data: { username } } });
  if (error) fail(error);
  // Without a session the project still requires email confirmation, which cannot work for ID-only accounts.
  if (!data.session) throw new CloudError('회원가입 설정(이메일 확인 끄기)이 필요해요. 선생님께 알려 주세요.');
  return toUser(data.user);
}

export async function signIn(username, password) {
  const { data, error } = await (await client()).auth.signInWithPassword({ email: usernameToEmail(username, DOMAIN), password });
  if (error) fail(error);
  return toUser(data.user);
}

export async function signOut() {
  const { error } = await (await client()).auth.signOut();
  if (error) fail(error);
}

export async function fetchCloudSave(userId) {
  const { data, error } = await (await client()).from(TABLE).select('save').eq('user_id', userId).maybeSingle();
  if (error) fail(error);
  return data?.save ?? null;
}

export async function pushCloudSave(userId, save) {
  const { error } = await (await client()).from(TABLE).upsert({ user_id: userId, save, updated_at: new Date().toISOString() });
  if (error) fail(error);
}

export async function deleteCloudSave(userId) {
  const { error } = await (await client()).from(TABLE).delete().eq('user_id', userId);
  if (error) fail(error);
}
