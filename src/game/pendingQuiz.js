// The question shown but not answered yet. Kept across refreshes so reloading the page
// or closing the quiz does not hand out a different (easier) question for free.
export const PENDING_KEY = 'coding-pet-pending-quiz-v1';

const store = storage => storage ?? globalThis.localStorage;

export function writePending(question, date, storage) {
  try { store(storage).setItem(PENDING_KEY, JSON.stringify({ date, question })); return true; } catch { return false; }
}

export function clearPending(storage) {
  try { store(storage).removeItem(PENDING_KEY); } catch { /* the next answer clears it */ }
}

// Today's unanswered question, or null. Questions from another day or damaged records are dropped.
export function readPending(date, storage) {
  try {
    const record = JSON.parse(store(storage).getItem(PENDING_KEY));
    const question = record?.question;
    const valid = record?.date === date && question && typeof question.instanceId === 'string' &&
      typeof question.code === 'string' && typeof question.question === 'string' &&
      Array.isArray(question.options) && question.options.length === 4 && question.correctAnswer !== undefined &&
      (!question.challenge || question.challenge.date === date);
    if (valid) return question;
    if (record) clearPending(storage);
    return null;
  } catch { return null; }
}

// Recently answered questions, kept across refreshes so the question just solved is not handed out again.
export const RECENT_KEY = 'coding-pet-recent-questions-v1';
const RECENT_LIMIT = 10;

export function readRecent(storage) {
  try {
    const list = JSON.parse(store(storage).getItem(RECENT_KEY));
    return Array.isArray(list) ? list.filter(item => item && typeof item.instanceId === 'string' && typeof item.templateId === 'string' && typeof item.code === 'string').slice(-RECENT_LIMIT) : [];
  } catch { return []; }
}

// Adds an answered question and returns the updated list (also returned when storage fails).
export function addRecent(question, storage, list = readRecent(storage)) {
  const { instanceId, templateId, code } = question;
  const next = [...list.filter(item => item.instanceId !== instanceId), { instanceId, templateId, code, challenge: Boolean(question.challenge) }].slice(-RECENT_LIMIT);
  try { store(storage).setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* memory copy still avoids repeats in this tab */ }
  return next;
}

export function clearRecent(storage) {
  try { store(storage).removeItem(RECENT_KEY); } catch { /* nothing to clear */ }
}
