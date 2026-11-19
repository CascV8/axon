// The five question types. Each is controlled by the lesson player:
//   value     – current response (type-specific)
//   onChange  – report a new response
//   locked    – true once the answer has been checked
// Grading lives in lib/core.js `grade()`.
import { useEffect, useMemo, useRef, useState } from 'react';
import { shuffle, shuffleNotIdentity } from '../lib/core.js';
import { play } from '../lib/sound.js';

const isTyping = (e) => ['INPUT', 'TEXTAREA'].includes(e.target?.tagName);

/* ---------- Multiple choice ---------- */
export function MCQ({ q, value, onChange, locked }) {
  useEffect(() => {
    if (locked) return;
    const onKey = (e) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) { onChange(n - 1); play('tap'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, locked, onChange]);

  return (
    <div>
      <h2 className="q-prompt" id={`p-${q.id}`}>{q.prompt}</h2>
      <div className="choices" role="radiogroup" aria-labelledby={`p-${q.id}`}>
        {q.options.map((opt, i) => {
          const state = locked ? (i === q.answer ? 'correct' : i === value ? 'wrong' : '') : (i === value ? 'selected' : '');
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={value === i}
              disabled={locked}
              className={`choice ${state}`}
              onClick={() => { onChange(i); play('tap'); }}
            >
              <span className="choice-key" aria-hidden="true">{i + 1}</span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- True / False ---------- */
export function TrueFalse({ q, value, onChange, locked }) {
  useEffect(() => {
    if (locked) return;
    const onKey = (e) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 't' || k === '1') { onChange(true); play('tap'); }
      if (k === 'f' || k === '2') { onChange(false); play('tap'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, onChange]);

  const opts = [{ v: true, label: 'True', key: 'T' }, { v: false, label: 'False', key: 'F' }];
  return (
    <div>
      <p className="q-kicker">True or false?</p>
      <h2 className="q-prompt" id={`p-${q.id}`}>{q.statement}</h2>
      <div className="tf" role="radiogroup" aria-labelledby={`p-${q.id}`}>
        {opts.map((o) => {
          const state = locked ? (o.v === q.answer ? 'correct' : o.v === value ? 'wrong' : '') : (o.v === value ? 'selected' : '');
          return (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={value === o.v}
              disabled={locked}
              className={`choice tf-btn ${state}`}
              onClick={() => { onChange(o.v); play('tap'); }}
            >
              <span className="choice-key" aria-hidden="true">{o.key}</span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Fill in the blank ---------- */
export function Fill({ q, value, onChange, locked }) {
  const [typing, setTyping] = useState(false);
  const bank = useMemo(() => shuffle(q.bank), [q]);
  const inputRef = useRef(null);
  const [before, after] = q.text.split('___');

  useEffect(() => { if (typing) inputRef.current?.focus(); }, [typing]);

  return (
    <div>
      <p className="q-kicker">Fill in the blank</p>
      <h2 className="q-prompt fill-text">
        {before}
        {typing ? (
          <input
            ref={inputRef}
            className="blank-input"
            value={value ?? ''}
            disabled={locked}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Your answer"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        ) : (
          <span className={`blank ${value ? 'filled' : ''}`} aria-live="polite">
            {value ? value : <span className="sr-only">blank</span>}
          </span>
        )}
        {after}
      </h2>
      {!typing && (
        <div className="bank" role="group" aria-label="Word bank">
          {bank.map((w) => (
            <button
              key={w}
              type="button"
              className={`chip ${value === w ? 'selected' : ''}`}
              aria-pressed={value === w}
              disabled={locked}
              onClick={() => { onChange(value === w ? null : w); play('tap'); }}
            >
              {w}
            </button>
          ))}
        </div>
      )}
      {!locked && (
        <button type="button" className="link-btn" onClick={() => { setTyping(!typing); onChange(null); }}>
          {typing ? 'Use the word bank instead' : 'Type the answer instead (harder)'}
        </button>
      )}
    </div>
  );
}

/* ---------- Match term to definition ---------- */
export function Match({ q, onChange, locked }) {
  const left = useMemo(() => shuffle(q.pairs.map((p) => p.left)), [q]);
  const right = useMemo(() => shuffle(q.pairs.map((p) => p.right)), [q]);
  const answerOf = useMemo(() => Object.fromEntries(q.pairs.map((p) => [p.left, p.right])), [q]);
  const [sel, setSel] = useState({ left: null, right: null });
  const [done, setDone] = useState([]); // matched left items
  const [mistakes, setMistakes] = useState(0);
  const [flash, setFlash] = useState(null); // { left, right } wrong pair briefly shown

  useEffect(() => {
    setSel({ left: null, right: null }); setDone([]); setMistakes(0); setFlash(null);
  }, [q]);

  function pick(side, item) {
    if (locked) return;
    const next = { ...sel, [side]: sel[side] === item ? null : item };
    if (next.left && next.right) {
      if (answerOf[next.left] === next.right) {
        const d = [...done, next.left];
        setDone(d);
        play('tap');
        onChange({ complete: d.length === q.pairs.length, mistakes });
      } else {
        const m = mistakes + 1;
        setMistakes(m);
        setFlash(next);
        play('wrong');
        setTimeout(() => setFlash(null), 650);
        onChange({ complete: false, mistakes: m });
      }
      setSel({ left: null, right: null });
    } else {
      setSel(next);
    }
  }

  const doneRight = new Set(done.map((l) => answerOf[l]));
  const cls = (side, item) => {
    const matched = side === 'left' ? done.includes(item) : doneRight.has(item);
    if (matched) return 'matched';
    if (flash && flash[side] === item) return 'wrong shake';
    if (sel[side] === item) return 'selected';
    return '';
  };

  return (
    <div>
      <p className="q-kicker">Match the pairs</p>
      <h2 className="q-prompt">{q.prompt || 'Tap a term, then its matching description.'}</h2>
      <div className="match">
        {[['left', left], ['right', right]].map(([side, items]) => (
          <div key={side} className={`match-col match-${side}`} role="group" aria-label={side === 'left' ? 'Terms' : 'Descriptions'}>
            {items.map((item) => {
              const c = cls(side, item);
              return (
                <button
                  key={item}
                  type="button"
                  className={`choice match-item ${c}`}
                  aria-pressed={sel[side] === item}
                  disabled={locked || c === 'matched'}
                  onClick={() => pick(side, item)}
                >
                  {item}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {mistakes > 0 && <p className="match-note" aria-live="polite">{mistakes} mismatch{mistakes > 1 ? 'es' : ''}</p>}
    </div>
  );
}

/* ---------- Order the steps ---------- */
export function Order({ q, value, onChange, locked }) {
  const pool = useMemo(() => shuffleNotIdentity(q.items), [q]);
  const placed = value ?? [];
  const remaining = pool.filter((x) => !placed.includes(x));

  const add = (item) => { if (!locked) { onChange([...placed, item]); play('tap'); } };
  const remove = (item) => { if (!locked) onChange(placed.filter((x) => x !== item)); };
  const move = (i, d) => {
    const j = i + d;
    if (locked || j < 0 || j >= placed.length) return;
    const a = placed.slice();
    [a[i], a[j]] = [a[j], a[i]];
    onChange(a);
  };

  return (
    <div>
      <p className="q-kicker">Put in order</p>
      <h2 className="q-prompt">{q.prompt}</h2>
      <ol className="order-list" aria-label="Your order">
        {placed.map((item, i) => {
          const state = locked ? (q.items[i] === item ? 'correct' : 'wrong') : '';
          return (
            <li key={item} className={`order-item ${state}`}>
              <span className="order-num" aria-hidden="true">{i + 1}</span>
              <span className="order-text">{item}</span>
              {!locked && (
                <span className="order-tools">
                  <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${item} up`}>↑</button>
                  <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === placed.length - 1} aria-label={`Move ${item} down`}>↓</button>
                  <button type="button" className="icon-btn" onClick={() => remove(item)} aria-label={`Remove ${item}`}>✕</button>
                </span>
              )}
            </li>
          );
        })}
        {Array.from({ length: q.items.length - placed.length }).map((_, i) => (
          <li key={`empty-${i}`} className="order-item empty" aria-hidden="true">
            <span className="order-num">{placed.length + i + 1}</span>
          </li>
        ))}
      </ol>
      {remaining.length > 0 && (
        <div className="bank" role="group" aria-label="Steps to place">
          {remaining.map((item) => (
            <button key={item} type="button" className="chip" disabled={locked} onClick={() => add(item)}>{item}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function QuestionView(props) {
  const C = { mcq: MCQ, tf: TrueFalse, fill: Fill, match: Match, order: Order }[props.q.type];
  return C ? <C {...props} /> : <p>Unsupported question type.</p>;
}

/** Whether the response is complete enough to enable the Check button. */
export function isReady(q, value) {
  switch (q.type) {
    case 'mcq': return Number.isInteger(value);
    case 'tf': return typeof value === 'boolean';
    case 'fill': return typeof value === 'string' && value.trim().length > 0;
    case 'match': return !!value?.complete;
    case 'order': return Array.isArray(value) && value.length === q.items.length;
    default: return false;
  }
}
