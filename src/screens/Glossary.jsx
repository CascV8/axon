import { useDeferredValue, useMemo, useState } from 'react';
import { visibleTerms } from '../content/index.js';
import { COMMAND_TERMS } from '../content/commandTerms.js';
import { normalize } from '../lib/core.js';
import { useActive } from '../lib/active.js';
import { Mastery } from '../components/Mastery.jsx';

function Highlight({ text, q }) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

const PAGE = 60;
// normalize() strips non-Latin letters; keep CJK etc. searchable with a lighter fold.
const fold = (s) => {
  const n = normalize(s);
  return n || String(s ?? '').toLowerCase().trim();
};

export function Glossary() {
  const { p, course, meta, level } = useActive();
  const [query, setQuery] = useState('');
  const [unit, setUnit] = useState('all');
  const [tab, setTab] = useState('keyterms');
  const [limit, setLimit] = useState(PAGE);
  const q = useDeferredValue(query.trim());

  const terms = useMemo(() => visibleTerms(course, level), [course, level]);

  const results = useMemo(() => {
    const nq = fold(q);
    const pool = unit === 'all' ? terms : terms.filter((t) => course.topicById.get(t.topicId)?.unit === unit);
    if (!nq) return [...pool].sort((a, b) => a.term.localeCompare(b.term));
    const scored = [];
    for (const t of pool) {
      const nt = fold(t.term);
      let score = -1;
      if (nt === nq) score = 0;
      else if (nt.startsWith(nq)) score = 1;
      else if (nt.includes(nq)) score = 2;
      else if (fold(t.definition).includes(nq)) score = 3;
      else if (course.topicById.get(t.topicId)?.code.toLowerCase() === q.toLowerCase()) score = 4;
      if (score >= 0) scored.push([score, t]);
    }
    return scored.sort((a, b) => a[0] - b[0] || a[1].term.localeCompare(b[1].term)).map((x) => x[1]);
  }, [q, unit, terms, course]);

  const cmd = useMemo(() => {
    const nq = fold(q);
    return COMMAND_TERMS.filter((c) => !nq || fold(c.term).includes(nq) || fold(c.definition).includes(nq));
  }, [q]);

  return (
    <div className="glossary">
      <h1 className="page-title">Glossary <small className="page-course">{meta.icon} {meta.name}</small></h1>
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
          <div className="chip-row" role="group" aria-label="Filter by unit">
            {[{ id: 'all', title: 'All' }, ...course.units].map((u) => (
              <button key={u.id} className={`chip ${unit === u.id ? 'selected' : ''}`} aria-pressed={unit === u.id} onClick={() => { setUnit(u.id); setLimit(PAGE); }}>
                {u.id === 'all' ? 'Everything' : `${u.id}: ${u.title}`}
              </button>
            ))}
          </div>
          <p className="result-count" aria-live="polite">{results.length} result{results.length === 1 ? '' : 's'}</p>
          {results.length === 0 ? (
            <div className="card placeholder"><p>No keyterms match “{q}”. Try a shorter word.</p></div>
          ) : (
            <dl className="terms card">
              {results.slice(0, limit).map((k) => {
                const topic = course.topicById.get(k.topicId);
                return (
                  <div key={k.id} className="term-row">
                    <dt>
                      <span className="term-name"><Highlight text={k.term} q={q} /></span>
                      {k.hl && <span className="badge-hl">HL</span>}
                      <a className={`topic-code small ${topic.tone}`} href={`#/topic/${topic.id}`} title={topic.title}>{topic.code}</a>
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
