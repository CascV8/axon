import { Icon } from './Icon.jsx';
import { useProgress } from '../lib/store.js';
import { dueCount } from '../lib/sessions.js';

const TABS = [
  { id: 'learn', label: 'Learn', icon: 'path' },
  { id: 'practice', label: 'Practice', icon: 'repeat' },
  { id: 'exams', label: 'Exams', icon: 'target' },
  { id: 'glossary', label: 'Glossary', icon: 'book' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

export function BottomNav({ active }) {
  const p = useProgress();
  const due = dueCount(p, p.profile.track);
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map((t) => (
        <a
          key={t.id}
          href={`#/${t.id}`}
          className={`nav-item${active === t.id ? ' is-active' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
        >
          <span className="nav-icon">
            <Icon name={t.icon} size={24} />
            {t.id === 'practice' && due > 0 && <span className="nav-dot" aria-label={`${due} due`} />}
          </span>
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  );
}
