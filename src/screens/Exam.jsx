// Timed multiple-choice exam: answer freely, submit, then get a topic breakdown.
// Uses the course's real MCQ paper format where it has one; otherwise a timed quiz.
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildExam } from '../lib/sessions.js';
import { actions, useProgress } from '../lib/store.js';
import { play } from '../lib/sound.js';
import { visibleTopics } from '../content/index.js';

function fmt(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function examConfig(course, level) {
  const m = course.meta.mcqExam;
  const full = m?.[level];
  const lengths = [...new Set([10, 20, ...(full ? [full] : [30, 40])])].sort((a, b) => a - b);
  return { label: m?.label ?? 'Timed quiz', full, secs: m?.secondsPerQuestion ?? 75, lengths };
}

function Setup({ course, level, onStart }) {
  const p = useProgress();
  const cfg = examConfig(course, level);
  const topics = visibleTopics(course, level);
  const units = course.units.filter((u) => topics.some((t) => t.unit === u.id));
  const [picked, setPicked] = useState(units.map((u) => u.id));
  const available = useMemo(
    () => topics.filter((t) => picked.includes(t.unit)).reduce((n, t) => n + t.lessons.reduce((m, l) => m + l.questions.filter((q) => q.type === 'mcq').length, 0), 0),
    [topics, picked],
  );
  const [n, setN] = useState(cfg.full && cfg.full <= 40 ? Math.min(cfg.full, 20) : 20);
  const [timed, setTimed] = useState(true);
  const toggle = (id) => setPicked((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  const last = p.exams.filter((e) => (e.course ?? 'biology') === course.id).slice(-5).reverse();
  const count = Math.min(n, available);

  return (
    <div className="exam">
      <a className="back-link" href="#/exams">‹ Exam prep</a>
      <h1 className="page-title">{cfg.label} <small className="page-course">{course.meta.icon} {course.meta.name} {course.meta.levels.length > 1 ? level : ''}</small></h1>
      <p>{course.meta.mcqExam
        ? `Multiple choice in the style of the real paper (${cfg.full} questions at ${level}). No feedback until you submit.`
        : `${course.meta.name} has no multiple-choice paper, so this is a timed quiz of lesson questions to test recall under pressure.`}</p>
      <section className="card">
        <fieldset className="fieldset">
          <legend>{course.meta.unitLabel || 'Units'}</legend>
          <div className="chip-row">
            {units.map((u) => (
              <label key={u.id} className={`chip chip-check ${picked.includes(u.id) ? 'selected' : ''}`}>
                <input type="checkbox" checked={picked.includes(u.id)} onChange={() => toggle(u.id)} />
                {u.id}: {u.title}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="fieldset">
          <legend>Questions</legend>
          <div className="seg" role="radiogroup">
            {cfg.lengths.map((x) => (
              <label key={x} className={`seg-item ${n === x ? 'selected' : ''}`}>
                <input type="radio" name="len" checked={n === x} onChange={() => setN(x)} />{x}{x === cfg.full ? <small>full paper</small> : null}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="switch-row">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
          <span>Timed ({fmt(count * cfg.secs)})</span>
        </label>
        {available < n && picked.length > 0 && <p className="muted-small">Only {available} multiple-choice questions match those {(course.meta.unitLabel || 'unit').toLowerCase()}s, so the exam will have {available}.</p>}
        <button className="btn btn-primary btn-wide" disabled={!picked.length || !available} onClick={() => onStart({ units: picked, n: count, timed, secs: cfg.secs })}>
          Start
        </button>
      </section>
      {last.length > 0 && (
        <section className="card">
          <h2>Recent attempts</h2>
          <ul className="list">
            {last.map((e) => (
              <li key={e.at} className="list-row">
                <span className="list-main">
                  <span className="list-title">{Math.round((e.score / e.total) * 100)}% · {e.score}/{e.total}</span>
                  <span className="list-sub">{(e.units ?? e.themes ?? []).join(', ')} · {new Date(e.at).toLocaleDateString()}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Results({ course, questions, answers, secs, onDone, onRetry }) {
  const score = questions.filter((q, i) => answers[i] === q.answer).length;
  const pct = Math.round((score / questions.length) * 100);
  const byTopic = useMemo(() => {
    const m = new Map();
    questions.forEach((q, i) => {
      const r = m.get(q.topicId) ?? { right: 0, total: 0 };
      r.total++; if (answers[i] === q.answer) r.right++;
      m.set(q.topicId, r);
    });
    return [...m.entries()].sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total);
  }, [questions, answers]);
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="exam">
      <h1 className="page-title">Results</h1>
      <div className="tiles">
        <div className="tile tile-acc"><span className="tile-label">Score</span><span className="tile-value">{score}/{questions.length}</span></div>
        <div className="tile tile-xp"><span className="tile-label">Percent</span><span className="tile-value">{pct}%</span></div>
        <div className="tile tile-time"><span className="tile-label">Time</span><span className="tile-value">{fmt(secs)}</span></div>
      </div>
      <section className="card">
        <h2>By topic</h2>
        <ul className="bars">
          {byTopic.map(([tid, r]) => {
            const t = course.topicById.get(tid);
            return (
              <li key={tid} className="bar-row">
                <a href={`#/topic/${tid}`} className="bar-label">{t?.code} {t?.title}</a>
                <span className="bar"><span className={`bar-fill ${r.right / r.total < 0.5 ? 'low' : ''}`} style={{ width: `${(r.right / r.total) * 100}%` }} /></span>
                <span className="bar-val">{r.right}/{r.total}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="card">
        <div className="row-between">
          <h2>Review answers</h2>
          <button className="link-btn" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show wrong only' : 'Show all'}</button>
        </div>
        <ol className="review-list">
          {questions.map((q, i) => {
            const ok = answers[i] === q.answer;
            if (ok && !showAll) return null;
            return (
              <li key={q.id} className={`review-item ${ok ? 'ok' : 'bad'}`}>
                <p className="review-q"><strong>Q{i + 1}.</strong> {q.prompt}</p>
                <p className="review-a">{ok ? '✓' : '✕'} Your answer: {answers[i] == null ? <em>no answer</em> : q.options[answers[i]]}</p>
                {!ok && <p className="review-a correct-text">Correct: {q.options[q.answer]}</p>}
                <p className="review-e">{q.explanation}</p>
              </li>
            );
          })}
        </ol>
        {score === questions.length && !showAll && <p>Every answer was right. Nothing to review!</p>}
      </section>
      <div className="stack">
        <button className="btn btn-primary btn-wide" onClick={onRetry}>New exam</button>
        <button className="btn btn-ghost btn-wide" onClick={onDone}>Back to exam prep</button>
      </div>
    </div>
  );
}

function Running({ course, level, config, onSubmit, onQuit }) {
  const questions = useMemo(() => buildExam(course, level, config.units, config.n), [config]); // eslint-disable-line react-hooks/exhaustive-deps
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(null));
  const [i, setI] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const limit = config.timed ? questions.length * config.secs : Infinity;
  const submitted = useRef(false);

  const submit = () => {
    if (submitted.current) return;
    submitted.current = true;
    onSubmit(questions, answers, elapsed);
  };

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (elapsed >= limit) submit(); }); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (confirm || e.target?.tagName === 'INPUT') return;
      const q = questions[i];
      const n = Number(e.key);
      if (q && n >= 1 && n <= q.options.length) setAnswers((a) => { const b = a.slice(); b[i] = n - 1; return b; });
      if (e.key === 'ArrowRight') setI((x) => Math.min(questions.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, questions, confirm]);

  const q = questions[i];
  const answered = answers.filter((a) => a != null).length;
  const remaining = limit - elapsed;
  const topic = course.topicById.get(q.topicId);

  return (
    <div className="session">
      <div className="session-top">
        <button className="icon-btn close-btn" onClick={onQuit} aria-label="Quit exam">✕</button>
        <div className="progress" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answered}>
          <div className="progress-fill" style={{ width: `${Math.max(3, (answered / questions.length) * 100)}%` }} />
        </div>
        <span className={`timer ${remaining < 60 ? 'low' : ''}`}>{config.timed ? fmt(Math.max(0, remaining)) : fmt(elapsed)}</span>
      </div>
      <main className="session-body" id="main">
        <p className="q-kicker">Question {i + 1} of {questions.length} · {topic?.code}</p>
        <h2 className="q-prompt" id="exam-q">{q.prompt}</h2>
        <div className="choices" role="radiogroup" aria-labelledby="exam-q">
          {q.options.map((opt, k) => (
            <button key={k} type="button" role="radio" aria-checked={answers[i] === k}
              className={`choice ${answers[i] === k ? 'selected' : ''}`}
              onClick={() => { setAnswers((a) => { const b = a.slice(); b[i] = k; return b; }); play('tap'); }}>
              <span className="choice-key" aria-hidden="true">{String.fromCharCode(65 + k)}</span>
              <span>{opt}</span>
            </button>
          ))}
        </div>
        <nav className="exam-grid" aria-label="Jump to question">
          {questions.map((_, k) => (
            <button key={k} className={`exam-cell ${answers[k] != null ? 'answered' : ''} ${k === i ? 'current' : ''}`}
              onClick={() => setI(k)} aria-label={`Question ${k + 1}${answers[k] != null ? ', answered' : ''}`} aria-current={k === i ? 'step' : undefined}>
              {k + 1}
            </button>
          ))}
        </nav>
      </main>
      <footer className="session-foot">
        <div className="foot-inner">
          <button className="btn btn-ghost" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>Back</button>
          {i < questions.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setI(i + 1)}>Next</button>
          ) : (
            <button className="btn btn-success" onClick={() => setConfirm(true)}>Submit</button>
          )}
        </div>
      </footer>
      {confirm && (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirm(false)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="sub-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="sub-title">Submit exam?</h2>
            <p>{answered < questions.length ? `You have ${questions.length - answered} unanswered question(s).` : 'All questions answered.'}</p>
            <div className="stack">
              <button className="btn btn-success" autoFocus onClick={submit}>Submit</button>
              <button className="btn btn-ghost" onClick={() => setConfirm(false)}>Keep working</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Exam({ course, level, onExit }) {
  const [stage, setStage] = useState({ name: 'setup' });

  if (stage.name === 'running') {
    return (
      <Running
        key={stage.key}
        course={course}
        level={level}
        config={stage.config}
        onQuit={() => setStage({ name: 'setup' })}
        onSubmit={(questions, answers, secs) => {
          const score = questions.filter((q, i) => answers[i] === q.answer).length;
          questions.forEach((q, i) => actions.recordAnswer(q, answers[i] === q.answer, { lessonId: q.lessonId }));
          actions.logExam({ at: Date.now(), course: course.id, score, total: questions.length, units: stage.config.units, secs });
          actions.addXp(Math.max(5, score));
          play('complete');
          setStage({ name: 'results', questions, answers, secs });
        }}
      />
    );
  }
  if (stage.name === 'results') {
    return <Results course={course} {...stage} onDone={onExit} onRetry={() => setStage({ name: 'setup' })} />;
  }
  return <Setup course={course} level={level} onStart={(config) => setStage({ name: 'running', config, key: Date.now() })} />;
}
