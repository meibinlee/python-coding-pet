export const newVacation = () => ({ startedAt: null });
export const isOnVacation = pet => Boolean(pet.vacation?.startedAt);
export function vacationTime(pet, now = Date.now()) {
  return isOnVacation(pet) ? Math.min(now, Date.parse(pet.vacation.startedAt)) : now;
}
export function resumeVacation(pet, now = Date.now()) {
  if (!isOnVacation(pet)) return pet;
  const elapsed = Math.max(0, now - Date.parse(pet.vacation.startedAt));
  return { ...pet, vacation: newVacation(),
    maintenance: pet.maintenance ? Object.fromEntries(Object.entries(pet.maintenance).map(([action, time]) => [action, time + elapsed])) : undefined,
    growth: { ...pet.growth, pausedMs: (pet.growth.pausedMs ?? 0) + elapsed },
    health: { ...pet.health,
      carePausedMs: pet.level >= 2 ? (pet.health.carePausedMs ?? 0) + elapsed : 0,
      recoveryPausedMs: pet.health.recoveryStartedAt ? (pet.health.recoveryPausedMs ?? 0) + elapsed : 0,
    },
  };
}

export function normalizeVacation(record, now = Date.now()) {
  const time = typeof record?.startedAt === 'string' ? Date.parse(record.startedAt) : NaN;
  return Number.isFinite(time) && time <= now ? { startedAt: new Date(time).toISOString() } : newVacation();
}
