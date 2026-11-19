import { termStrength } from '../lib/core.js';

const LABELS = ['Not practised yet', 'Learning', 'Learning', 'Familiar', 'Strong', 'Mastered'];

/** Five little dots showing how well a keyterm is known (from its SRS box). */
export function Mastery({ s }) {
  const filled = Math.round(termStrength(s) * 5);
  return (
    <span className="mastery" role="img" aria-label={`Mastery: ${LABELS[filled]}`} title={LABELS[filled]}>
      {Array.from({ length: 5 }, (_, i) => <span key={i} className={i < filled ? 'on' : ''} />)}
    </span>
  );
}
