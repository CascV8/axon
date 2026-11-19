// Exam prep hub: paper structure, question bank, simulator, grade tools, IA.
import { ASSESSMENT } from '../content/ibData.js';
import { EXAM_ITEMS } from '../content/exam.js';
import { useProgress } from '../lib/store.js';

export function Exams() {
  const p = useProgress();
  const track = p.profile.track;
  const a = ASSESSMENT[track];
  const lastExam = p.exams[p.exams.length - 1];
  return (
    <div className="exams">
      <h1 className="page-title">Exam prep</h1>

      <a className="card action-card" href="#/bank">
        <span className="action-icon" aria-hidden="true">✍️</span>
        <span className="action-main">
          <span className="action-title">Question bank</span>
          <span className="action-sub">{EXAM_ITEMS.length} Paper 1B &amp; Paper 2 style questions with markschemes · self-mark like an examiner</span>
        </span>
      </a>
      <a className="card action-card action-exam" href="#/exam">
        <span className="action-icon" aria-hidden="true">⏱️</span>
        <span className="action-main">
          <span className="action-title">Paper 1A simulator</span>
          <span className="action-sub">{lastExam ? `Last score ${Math.round((lastExam.score / lastExam.total) * 100)}% · ` : ''}Timed multiple choice, {track === 'HL' ? '40' : '30'} questions for a full paper</span>
        </span>
      </a>
      <a className="card action-card" href="#/grades">
        <span className="action-icon" aria-hidden="true">📊</span>
        <span className="action-main">
          <span className="action-title">Grade calculator &amp; boundaries</span>
          <span className="action-sub">Predict your 1–7, see past boundaries, diploma points and how students score</span>
        </span>
      </a>
      <a className="card action-card" href="#/ia">
        <span className="action-icon" aria-hidden="true">🧪</span>
        <span className="action-main">
          <span className="action-title">IA toolkit</span>
          <span className="action-sub">Self-assess the four criteria, pre-submission checklist, word counter</span>
        </span>
      </a>

      <section className="card" aria-labelledby="papers-title">
        <h2 id="papers-title">Know your papers · Biology {track}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Component</th><th scope="col">Marks</th><th scope="col">Time</th><th scope="col">Weight</th></tr></thead>
            <tbody>
              {Object.entries(a.groups).map(([gid, g]) => {
                const comps = a.components.filter((c) => c.group === gid);
                return (
                  <tr key={gid}>
                    <th scope="row">{g.name}<small>{comps.map((c) => `${c.name}: ${c.detail} (${c.max})`).join(' · ')}</small></th>
                    <td>{comps.reduce((s, c) => s + c.max, 0)}</td>
                    <td>{g.time}</td>
                    <td>{g.weight}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3 className="mini-title">Examiner tips</h3>
        <ul className="look-list">
          <li><strong>Obey the command term.</strong> "Describe" the trend, "explain" with a mechanism, "evaluate" with strengths and limitations.</li>
          <li><strong>Quote data with units.</strong> "Increased from 12 to 30 mg" beats "increased a lot".</li>
          <li><strong>One mark ≈ one distinct point.</strong> A 4-mark question wants four separate, precise ideas.</li>
          <li><strong>Correlation ≠ causation.</strong> Say what the data suggest, not what they prove.</li>
          <li><strong>Use precise terms.</strong> Enzymes denature (they don't die); molecules, not "particles"; ATP releases energy, it isn't "made".</li>
        </ul>
      </section>
    </div>
  );
}
