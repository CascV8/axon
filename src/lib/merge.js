// Merge two progress snapshots (e.g. this device + the cloud) without losing work.
// Pure function: used by sync and covered by unit tests.

const maxBy = (a, b, key) => ((b?.[key] ?? -Infinity) > (a?.[key] ?? -Infinity) ? b : a);

function mergeMap(a = {}, b = {}, pick) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? pick(out[k], v) : v;
  return out;
}

export function mergeStates(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const lp = local.profile ?? {}, rp = remote.profile ?? {};
  // Prefer the profile that has finished onboarding; otherwise the local one.
  const baseProfile = lp.onboarded || !rp.onboarded ? { ...rp, ...lp } : { ...lp, ...rp };
  const courses = [...(rp.courses ?? []), ...(lp.courses ?? [])].reduce((acc, c) => {
    const i = acc.findIndex((x) => x.id === c.id);
    if (i < 0) acc.push(c); else acc[i] = c; // local wins for level choice
    return acc;
  }, []);

  const ls = local.streak ?? {}, rs = remote.streak ?? {};
  const streakNewer = (rs.last ?? '') > (ls.last ?? '') ? rs : ls;

  const exams = [...(remote.exams ?? []), ...(local.exams ?? [])]
    .filter((e, i, all) => all.findIndex((x) => x.at === e.at) === i)
    .sort((x, y) => x.at - y.at)
    .slice(-50);

  const statKeys = new Set([...Object.keys(local.stats ?? {}), ...Object.keys(remote.stats ?? {})]);
  const stats = {};
  for (const k of statKeys) stats[k] = Math.max(local.stats?.[k] ?? 0, remote.stats?.[k] ?? 0);

  return {
    ...remote,
    ...local,
    profile: { ...baseProfile, courses, onboarded: Boolean(lp.onboarded || rp.onboarded) },
    xp: Math.max(local.xp ?? 0, remote.xp ?? 0),
    xpByDay: mergeMap(local.xpByDay, remote.xpByDay, Math.max),
    streak: { ...streakNewer, best: Math.max(ls.best ?? 0, rs.best ?? 0) },
    hearts: local.hearts ?? remote.hearts,
    lessons: mergeMap(local.lessons, remote.lessons, (a, b) => ({
      done: Math.max(a.done ?? 0, b.done ?? 0),
      best: Math.max(a.best ?? 0, b.best ?? 0),
      last: Math.max(a.last ?? 0, b.last ?? 0),
    })),
    terms: mergeMap(local.terms, remote.terms, (a, b) => maxBy(a, b, 'last')),
    mistakes: mergeMap(local.mistakes, remote.mistakes, (a, b) => maxBy(a, b, 'at')),
    topicStats: mergeMap(local.topicStats, remote.topicStats, (a, b) => maxBy(a, b, 'seen')),
    items: mergeMap(local.items, remote.items, (a, b) => {
      const newer = maxBy(a, b, 'at');
      return { ...newer, best: Math.max(a.best ?? 0, b.best ?? 0), tries: Math.max(a.tries ?? 0, b.tries ?? 0) };
    }),
    drafts: { ...(remote.drafts ?? {}), ...(local.drafts ?? {}) },
    ia: { ...(remote.ia ?? {}), ...(local.ia ?? {}) },
    daily: { ...(remote.daily ?? {}), ...(local.daily ?? {}) },
    exams,
    stats,
  };
}
