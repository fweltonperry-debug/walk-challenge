/** After a pool's timer ends, players still have this long to open the app and sync. */
export const SYNC_GRACE_MS = 30 * 60 * 1000;

/** Any single day above this gets flagged for admin review (and can't win until cleared). */
export const MAX_STEPS_PER_DAY = 50000;

/** Step window for an entry: from when the player joined (or pool start) to pool end. */
export function entryWindow(poolStartsAt: Date | string, poolEndsAt: Date | string, joinedAt: Date | string) {
  const start = new Date(Math.max(new Date(poolStartsAt).getTime(), new Date(joinedAt).getTime()));
  const end = new Date(Math.min(new Date(poolEndsAt).getTime(), Date.now()));
  return { start, end };
}
