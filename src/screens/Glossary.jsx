import { useDeferredValue, useMemo, useState } from 'react';
import { THEMES, visibleTerms, topicById } from '../content/index.js';
import { COMMAND_TERMS } from '../content/commandTerms.js';
import { normalize } from '../lib/core.js';
import { useProgress } from '../lib/store.js';
import { Mastery } from '../components/Mastery.jsx';

function Highlight({ text, q }) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

const PAGE = 60;

export function Glossary() {
  const p = useProgress();
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState('all');
  const [tab, setTab] = useState('keyterms');
  const [limit, setLimit] = useState(PAGE);
  const q = useDeferredValue(query.trim());

  const terms = useMemo(() => visibleTerms(p.profile.track), [p.profile.track]);

  const results = useMemo(() => {
    const nq = normalize(q);
    const pool = theme === 'all' ? terms : terms.filter((t) => t.topicId[0] === theme);
    if (!nq) return [...pool].sort((a, b) => a.term.localeCompare(b.term));
    const scored = [];
    for (const t of pool) {
      const nt = normalize(t.term);
      let score = -1;
      if (nt === nq) score = 0;
      else if (nt.startsWith(nq)) score = 1;
      else if (nt.includes(nq)) score = 2;
      else if (normalize(t.definition).includes(nq)) score = 3;
      else if (t.topicId.toLowerCase() === q.toLowerCase()) score = 4;
      if (score >= 0) scored.push([score, t]);
    }
    return scored.sort((a, b) => a[0] - b[0] || a[1].term.localeCompare(b[1].term)).map((x) => x[1]);
  }, [q, theme, terms]);

  const cmd = useMemo(() => {
    const nq = normalize(q);
    return COMMAND_TERMS.filter((c) => !nq || normalize(c.term).includes(nq) || normalize(c.definition).includes(nq));
  }, [q]);

  return (
    <div className="glossary">
      <h1 className="page-title">Glossary</h1>
      <div className="seg seg-tabs" role="tablist" aria-label="Glossary sections">
        <button role="tab" aria-selected={tab === 'keyterms'} className={`seg-item ${tab === 'keyterms' ? 'selected' : ''}`} onClick={() => setTab('keyterms')}>Keyterms ({terms.length})</button>
        <button role="tab" aria-selected={tab === 'command'} className={`seg-item ${tab === 'command' ? 'selected' : ''}`} onClick={() => setTab('command')}>Command terms</button>
      </div>
      <div className="search">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          className="search-input"
          placeholder={tab === 'keyterms' ? 'Search keyterms, definitions or a topic code…' : 'Search command terms…'}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
          aria-label="Search glossary"
        />
      </div>

      {tab === 'keyterms' ? (
        <>
          <div className="chip-row" role="group" aria-label="Filter by theme">
            {[{ id: 'all', title: 'All' }, ...THEMES].map((th) => (
              <button key={th.id} className={`chip ${theme === th.id ? 'selected' : ''}`} aria-pressed={theme === th.id} onClick={() => { setTheme(th.id); setLimit(PAGE); }}>
                {th.id === 'all' ? 'All themes' : `${th.id}: ${th.title}`}
              </button>
            ))}
          </div>
          <p className="result-count" aria-live="polite">{results.length} result{results.length === 1 ? '' : 's'}</p>
          {results.length === 0 ? (
            <div className="card placeholder"><p>No keyterms match “{q}”. Try a shorter word.</p></div>
          ) : (
            <dl className="terms card">
              {results.slice(0, limit).map((k) => {
                const topic = topicById.get(k.topicId);
                return (
                  <div key={k.id} className="term-row">
                    <dt>
                      <span className="term-name"><Highlight text={k.term} q={q} /></span>
                      {k.hl && <span className="badge-hl">HL</span>}
                      <a className={`topic-code small theme-${topic.theme}`} href={`#/topic/${topic.id}`} title={topic.title}>{topic.id}</a>
                      <Mastery s={p.terms[k.id]} />
                    </dt>
                    <dd><Highlight text={k.definition} q={q} /></dd>
                  </div>
                );
              })}
            </dl>
          )}
          {results.length > limit && (
            <button className="btn btn-ghost btn-wide" onClick={() => setLimit(limit + PAGE)}>Show more ({results.length - limit} left)</button>
          )}
        </>
      ) : (
        <>
          <p className="notice">Command terms tell you how much depth an exam answer needs. AO1 = recall, AO2 = application, AO3 = analysis and evaluation.</p>
          <dl className="terms card">
            {cmd.map((c) => (
              <div key={c.term} className="term-row">
                <dt><span className="term-name"><Highlight text={c.term} q={q} /></span> <span className={`badge-ao ao-${c.ao}`}>AO{c.ao}</span></dt>
                <dd>{c.definition}</dd>
              </div>
            ))}
          </dl>
          <a className="btn btn-secondary btn-wide" href="#/practice/command">Drill command terms</a>
        </>
      )}
    </div>
  );
}
