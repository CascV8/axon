import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { useProgress } from '../lib/store.js';
import { currentHearts, dayKey, liveStreak, msToNextHeart, MAX_HEARTS } from '../lib/core.js';
import { SyncBadge } from '../screens/Account.jsx';

export function Header() {
  const p = useProgress();
  const [, tick] = useState(0);
  // Re-render each minute so heart refills and the streak stay current.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const today = dayKey();
  const streak = liveStreak(p.streak, today);
  const doneToday = p.streak.last === today;
  const hearts = currentHearts(p.hearts).count;
  const relaxed = p.profile.relaxed;
  const nextHeart = Math.ceil(msToNextHeart(p.hearts) / 60000);
  const heartsLabel = relaxed ? 'Unlimited hearts' : `${hearts} of ${MAX_HEARTS} hearts${hearts < MAX_HEARTS ? `, next in ${nextHeart} min` : ''}`;

  return (
    <header className="header">
      <div className="brand-wrap">
        <a className="brand" href="#/learn" aria-label="Axon home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Axon</span>
        </a>
        <a className="brand-course" href="#/courses" aria-label={`Course: Biology ${p.profile.track}. Change courses`}>🧬 Bio {p.profile.track} ▾</a>
        <SyncBadge />
      </div>
      <ul className="stats" aria-label="Your stats">
        <li className={`stat stat--streak ${doneToday ? '' : 'is-dim'}`} aria-label={`${streak} day streak${doneToday ? '' : ', practise today to extend it'}`} title="Day streak">
          <Icon name="flame" /> <span aria-hidden="true">{streak}</span>
        </li>
        <li className="stat stat--xp" aria-label={`${p.xp} XP`} title="Total XP">
          <Icon name="bolt" /> <span aria-hidden="true">{p.xp}</span>
        </li>
        <li className="stat stat--hearts" aria-label={heartsLabel} title={heartsLabel}>
          <Icon name="heart" /> <span aria-hidden="true">{relaxed ? '∞' : hearts}</span>
        </li>
      </ul>
    </header>
  );
}
