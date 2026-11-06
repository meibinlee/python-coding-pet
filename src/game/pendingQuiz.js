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
