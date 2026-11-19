import { useMemo, useRef, useState } from 'react';
import { actions, useProgress } from '../lib/store.js';
import { dayKey, levelProgress, liveStreak, termStrength } from '../lib/core.js';
import { THEMES, visibleTopics, topicById } from '../content/index.js';
import { ACHIEVEMENTS } from '../lib/achievements.js';

const GOALS = [
  { xp: 10, label: 'Casual' },
  { xp: 30, label: 'Regular' },
  { xp: 50, label: 'Serious' },
  { xp: 80, label: 'Intense' },
];

function Heatmap({ xpByDay, goal }) {
  const weeks = 15;
  const today = new Date();
  // Columns are weeks (Mon..Sun), ending with the current week.
  const cells = [];
  const end = new Date(today);
  end.setDate(today.getDate() + (6 - ((today.getDay() + 6) % 7)));
  const first = new Date(end);
  first.setDate(end.getDate() - weeks * 7 + 1);
  for (let d = new Date(first); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dayKey(d);
    const xp = xpByDay[key] ?? 0;
    const future = d > today;
    const lvl = future ? -1 : xp === 0 ? 0 : xp < goal / 2 ? 1 : xp < goal ? 2 : xp < goal * 2 ? 3 : 4;
    cells.push({ key, xp, lvl });
  }
  const activeDays = Object.values(xpByDay).filter((x) => x > 0).length;
  return (
    <div>
      <div className="heatmap" role="img" aria-label={`Activity over the last ${weeks} weeks: ${activeDays} active days in total`}>
        {cells.map((c) => <span key={c.key} className={`hm hm-${c.lvl}`} title={c.lvl >= 0 ? `${c.key}: ${c.xp} XP` : ''} />)}
      </div>
      <div className="hm-legend" aria-hidden="true">Less <span className="hm hm-0" /><span className="hm hm-1" /><span className="hm hm-2" /><span className="hm hm-3" /><span className="hm hm-4" /> More</div>
    </div>
  );
}

export function Profile() {
  const p = useProgress();
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const lp = levelProgress(p.xp);
  const streak = liveStreak(p.streak, dayKey());
  const topics = useMemo(() => visibleTopics(p.profile.track), [p.profile.track]);
  const accuracy = p.stats.questions ? Math.round((p.stats.correct / p.stats.questions) * 100) : 0;
  const mastered = Object.values(p.terms).filter((s) => s.box >= 5).length;

  const themeStats = THEMES.map((th) => {
    const tts = topics.filter((t) => t.theme === th.id);
    const lessons = tts.flatMap((t) => t.lessons);
    const terms = tts.flatMap((t) => t.keyterms);
    return {
      ...th,
      done: lessons.filter((l) => p.lessons[l.id]).length,
      total: lessons.length,
      mastery: terms.length ? terms.reduce((s, k) => s + termStrength(p.terms[k.id]), 0) / terms.length : 0,
    };
  });

  function exportProgress() {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `axon-progress-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg('Backup downloaded.');
  }
  async function importProgress(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      actions.importState(JSON.parse(await f.text()));
      setMsg('Progress restored from backup.');
    } catch (err) {
      setMsg(err.message || 'Could not read that file.');
    }
    e.target.value = '';
  }

  return (
    <div className="profile">
      <section className="card profile-hero">
        <div className="level-ring" style={{ '--pct': lp.pct }} role="img" aria-label={`Level ${lp.level}, ${lp.into} of ${lp.span} XP to next level`}>
          <span>{lp.level}</span>
        </div>
        <div className="profile-id">
          <h1>{p.profile.name || 'IB Biologist'}</h1>
          <p>{p.profile.track} Biology · {lp.span - lp.into} XP to level {lp.level + 1}</p>
        </div>
      </section>

      <div className="tiles tiles-4">
        <div className="tile tile-streak"><span className="tile-label">Streak</span><span className="tile-value">🔥 {streak}</span></div>
        <div className="tile tile-xp"><span className="tile-label">Total XP</span><span className="tile-value">{p.xp}</span></div>
        <div className="tile tile-acc"><span className="tile-label">Accuracy</span><span className="tile-value">{accuracy}%</span></div>
        <div className="tile"><span className="tile-label">Terms mastered</span><span className="tile-value">{mastered}</span></div>
      </div>

      <section className="card">
        <h2>Activity</h2>
        <p className="muted-small">Best streak: {p.streak.best ?? 0} days · {p.stats.lessons} sessions completed</p>
        <Heatmap xpByDay={p.xpByDay} goal={p.profile.dailyGoal} />
      </section>

      <section className="card">
        <h2>Course progress</h2>
        <ul className="bars">
          {themeStats.map((t) => (
            <li key={t.id} className="bar-row">
              <span className="bar-label">{t.id}: {t.title}</span>
              <span className="bar"><span className={`bar-fill theme-${t.id}`} style={{ width: `${t.total ? (t.done / t.total) * 100 : 0}%` }} /></span>
              <span className="bar-val">{t.done}/{t.total}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" aria-labelledby="acc-title">
        <h2 id="acc-title">Topic accuracy</h2>
        {Object.keys(p.topicStats).length === 0 ? (
          <p>Answer some questions and your strongest and weakest topics will show up here.</p>
        ) : (
          <ul className="bars">
            {Object.entries(p.topicStats)
              .filter(([tid]) => topicById.has(tid))
              .sort((a, b) => a[1].right / a[1].seen - b[1].right / b[1].seen)
              .map(([tid, r]) => {
                const pct = r.right / r.seen;
                return (
                  <li key={tid} className="bar-row">
                    <a className="bar-label" href={`#/practice/topic/${tid}`}>{tid} {topicById.get(tid).title}</a>
                    <span className="bar"><span className={`bar-fill ${pct < 0.6 ? 'low' : ''}`} style={{ width: `${pct * 100}%` }} /></span>
                    <span className="bar-val">{Math.round(pct * 100)}% <small>({r.seen})</small></span>
                  </li>
                );
              })}
          </ul>
        )}
        <p className="muted-small">First-try accuracy per topic. Tap a weak topic to drill it.</p>
      </section>

      <section className="card" aria-labelledby="badge-title">
        <h2 id="badge-title">Badges · {ACHIEVEMENTS.filter((a) => a.test(p)).length}/{ACHIEVEMENTS.length}</h2>
        <ul className="badges">
          {ACHIEVEMENTS.map((a) => {
            const got = a.test(p);
            return (
              <li key={a.id} className={`badge ${got ? 'got' : ''}`} title={a.desc}>
                <span className="badge-icon" aria-hidden="true">{got ? a.icon : '🔒'}</span>
                <span className="badge-name">{a.name}</span>
                <span className="badge-desc">{a.desc}{got ? '' : ' (locked)'}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card settings" aria-labelledby="settings-title">
        <h2 id="settings-title">Settings</h2>
        <label className="field">
          <span>Name</span>
          <input className="input" value={p.profile.name} maxLength={30} placeholder="Your name" onChange={(e) => actions.setProfile({ name: e.target.value })} />
        </label>

        <fieldset className="fieldset">
          <legend>Course level</legend>
          <div className="seg" role="radiogroup">
            {['SL', 'HL'].map((t) => (
              <label key={t} className={`seg-item ${p.profile.track === t ? 'selected' : ''}`}>
                <input type="radio" name="track" checked={p.profile.track === t} onChange={() => actions.setProfile({ track: t })} />
                {t === 'SL' ? 'Standard (SL)' : 'Higher (HL)'}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Daily goal</legend>
          <div className="seg" role="radiogroup">
            {GOALS.map((g) => (
              <label key={g.xp} className={`seg-item ${p.profile.dailyGoal === g.xp ? 'selected' : ''}`}>
                <input type="radio" name="goal" checked={p.profile.dailyGoal === g.xp} onChange={() => actions.setProfile({ dailyGoal: g.xp })} />
                {g.label}<small>{g.xp} XP</small>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Appearance</legend>
          <div className="seg" role="radiogroup">
            {['system', 'light', 'dark'].map((t) => (
              <label key={t} className={`seg-item ${p.profile.theme === t ? 'selected' : ''}`}>
                <input type="radio" name="theme" checked={p.profile.theme === t} onChange={() => actions.setProfile({ theme: t })} />
                {t[0].toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="switch-row">
          <input type="checkbox" checked={p.profile.sound} onChange={(e) => actions.setProfile({ sound: e.target.checked })} />
          <span>Sound effects</span>
        </label>
        <label className="switch-row">
          <input type="checkbox" checked={p.profile.relaxed} onChange={(e) => actions.setProfile({ relaxed: e.target.checked })} />
          <span>Unlimited hearts (relaxed mode)</span>
        </label>
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p>Progress is saved in this browser only. Download a backup to move it to another device.</p>
        <div className="row wrap">
          <button className="btn btn-secondary" onClick={exportProgress}>Download backup</button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>Restore backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importProgress} />
        </div>
        {msg && <p className="notice" role="status">{msg}</p>}
        {confirmReset ? (
          <div className="row wrap">
            <button className="btn btn-danger" onClick={() => { actions.reset(); setConfirmReset(false); setMsg('All progress was reset.'); }}>Yes, erase everything</button>
            <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        ) : (
          <button className="link-btn danger-text" onClick={() => setConfirmReset(true)}>Reset all progress…</button>
        )}
      </section>
      <p className="footnote">Axon is an independent study tool and is not affiliated with or endorsed by the International Baccalaureate Organization.</p>
    </div>
  );
}
