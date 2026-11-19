// Minimal hash router: #/learn, #/lesson/A1.1-1, #/topic/A1.1, #/practice, #/glossary, #/profile ...
import { useSyncExternalStore } from 'react';

function parse() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || 'learn', params: parts.slice(1), query: new URLSearchParams(query) };
}

let current = parse();
const listeners = new Set();
window.addEventListener('hashchange', () => {
  current = parse();
  listeners.forEach((l) => l());
});

export function useRoute() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => current,
  );
}

export function navigate(path, { replace = false } = {}) {
  const hash = '#/' + path.replace(/^#?\/?/, '');
  if (replace) {
    history.replaceState(null, '', hash);
    current = parse();
    listeners.forEach((l) => l());
  } else {
    window.location.hash = hash;
  }
}
