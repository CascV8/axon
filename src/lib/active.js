// The course the student is currently studying, and their level for it.
import { useProgress } from './store.js';
import { courseById, useCourse } from '../content/index.js';

export function activeCourseId(profile) {
  const list = (profile.courses ?? []).filter((c) => courseById.has(c.id));
  if (list.some((c) => c.id === profile.activeCourse)) return profile.activeCourse;
  return list[0]?.id ?? 'biology';
}

export function levelFor(profile, cid) {
  const meta = courseById.get(cid);
  const levels = meta?.levels ?? ['SL'];
  const chosen = (profile.courses ?? []).find((c) => c.id === cid)?.level;
  return levels.includes(chosen) ? chosen : levels[levels.length - 1];
}

/** { p, id, meta, course (null while loading), level, error, retry } */
export function useActive() {
  const p = useProgress();
  const id = activeCourseId(p.profile);
  const { course, error, retry } = useCourse(id);
  return { p, id, meta: courseById.get(id), course, level: levelFor(p.profile, id), error, retry };
}
