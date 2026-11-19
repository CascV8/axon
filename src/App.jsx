import { useEffect, useMemo } from 'react';
import { Header } from './components/Header.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { useRoute, navigate } from './lib/router.js';
import { useProgress, getState, isStorageAvailable, actions } from './lib/store.js';
import { useActive } from './lib/active.js';
import { buildReview, mistakeQuestions, topicQuestions, commandTermQuestions, dailyQuestions, dailyKey } from './lib/sessions.js';
import { dayKey } from './lib/core.js';
import { Exams } from './screens/Exams.jsx';
import { Bank } from './screens/Bank.jsx';
import { ExamItem } from './screens/ExamItem.jsx';
import { Grades } from './screens/Grades.jsx';
import { IaToolkit } from './screens/IaToolkit.jsx';
import { Flashcards } from './screens/Flashcards.jsx';
import { Learn } from './screens/Learn.jsx';
import { Topic } from './screens/Topic.jsx';
import { Session } from './screens/Session.jsx';
import { Practice } from './screens/Practice.jsx';
import { Exam } from './screens/Exam.jsx';
import { Glossary } from './screens/Glossary.jsx';
import { Profile } from './screens/Profile.jsx';
import { Onboarding } from './screens/Onboarding.jsx';
import { AccountPage, CoursesPage, PasswordRecovery, AccountNotice } from './screens/Account.jsx';

function useThemeAttr(theme) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);
}

function Empty({ title, body, href = '#/practice', cta = 'Back' }) {
  return (
    <div className="session session-center">
      <div className="big-emoji" aria-hidden="true">🌱</div>
      <h1>{title}</h1>
      <p>{body}</p>
      <a className="btn btn-primary" href={href}>{cta}</a>
    </div>
  );
}

function Loading({ meta, error, retry }) {
  return (
    <div className="session session-center" role="status">
      <div className="big-emoji spin" aria-hidden="true">{meta?.icon ?? '📚'}</div>
      {error ? (
        <>
          <h1>Couldn't load {meta?.name ?? 'this course'}</h1>
          <p>Check your connection and try again.</p>
          <button className="btn btn-primary" onClick={retry}>Try again</button>
        </>
      ) : <h1>Loading {meta?.name ?? 'course'}…</h1>}
    </div>
  );
}

/** Full-screen practice session; questions are built once per route visit. */
function PracticeSession({ kind, arg, routeKey, course, level }) {
  const { questions, title } = useMemo(() => {
    const s = getState();
    if (kind === 'review') return { questions: buildReview(s, course, level), title: `${course.meta.name}: smart review` };
    if (kind === 'mistakes') return { questions: mistakeQuestions(s, course, level), title: `${course.meta.name}: mistakes` };
    if (kind === 'command') return { questions: commandTermQuestions(10), title: 'Command terms' };
    if (kind === 'daily') return { questions: dailyQuestions(dayKey(), course, level), title: `${course.meta.name} daily challenge · ${dayKey()}` };
    if (kind === 'topic') {
      const t = course.topicById.get(arg);
      return { questions: t ? topicQuestions(t) : [], title: t ? `${t.code} ${t.title} quick-fire` : '' };
    }
    return { questions: [], title: '' };
  }, [kind, arg, routeKey, course, level]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!questions.length) {
    return kind === 'mistakes'
      ? <Empty title="No mistakes to fix" body="Questions you get wrong will appear here so you can nail them later." />
      : <Empty title="Nothing to practise yet" body="Complete a lesson first and your review queue will fill up." href="#/learn" cta="Go to lessons" />;
  }
  return (
    <Session
      key={routeKey}
      questions={questions}
      mode={kind === 'mistakes' ? 'mistakes' : kind === 'daily' ? 'daily' : 'review'}
      title={title}
      onFinish={kind === 'daily' ? ({ firstTry, total }) => {
        const key = dailyKey(dayKey(), course.id);
        if (getState().daily[key]) return 0;
        actions.completeDaily(key, firstTry, total);
        return 20;
      } : undefined}
      onExit={() => navigate(kind === 'topic' ? `topic/${arg}` : 'practice')}
    />
  );
}

export default function App() {
  const route = useRoute();
  const progress = useProgress();
  const { course, meta, level, error, retry } = useActive();
  useThemeAttr(progress.profile.theme);

  // Scroll to top on navigation between tabs.
  useEffect(() => { window.scrollTo(0, 0); }, [route.name, route.params[0]]);

  if (!progress.profile.onboarded) return <><Onboarding /><PasswordRecovery /><AccountNotice /></>;

  const key = `${route.name}/${route.params.join('/')}`;
  const fullScreen = route.name === 'lesson' || route.name === 'exam' || (route.name === 'practice' && route.params[0]);

  if (fullScreen && !course) return <Loading meta={meta} error={error} retry={retry} />;

  if (route.name === 'lesson') {
    const lesson = course.lessonById.get(route.params[0]);
    if (!lesson) return <Empty title="Lesson not found" body={`That lesson isn't part of ${meta.name}. Switch course or pick another lesson.`} href="#/learn" cta="Back to course" />;
    const topic = course.topicById.get(lesson.topicId);
    return (
      <Session
        key={key}
        questions={lesson.questions}
        mode="lesson"
        lessonId={lesson.id}
        title={`${topic.code} ${topic.title} · ${lesson.title}`}
        onExit={() => navigate('learn')}
      />
    );
  }
  if (route.name === 'practice' && route.params[0]) {
    return <PracticeSession kind={route.params[0]} arg={route.params[1]} routeKey={key} course={course} level={level} />;
  }
  if (route.name === 'exam') return <Exam key={course.id} course={course} level={level} onExit={() => navigate('exams')} />;

  let screen;
  let tab = route.name;
  const needsCourse = !['account', 'courses', 'profile'].includes(route.name);
  if (needsCourse && !course) {
    screen = <Loading meta={meta} error={error} retry={retry} />;
    if (!['practice', 'exams', 'glossary'].includes(tab)) tab = 'learn';
  } else {
    switch (route.name) {
      case 'topic': screen = <Topic id={route.params[0]} />; tab = 'learn'; break;
      case 'practice': screen = <Practice />; break;
      case 'exams': screen = <Exams />; break;
      case 'bank': screen = <Bank />; tab = 'exams'; break;
      case 'question': screen = <ExamItem key={route.params[0]} id={route.params[0]} />; tab = 'exams'; break;
      case 'grades': screen = <Grades />; tab = 'exams'; break;
      case 'ia': screen = <IaToolkit />; tab = 'exams'; break;
      case 'account': screen = <AccountPage />; tab = 'profile'; break;
      case 'courses': screen = <CoursesPage />; tab = 'learn'; break;
      case 'flashcards': screen = <Flashcards key={`${course.id}/${route.params[0] ?? 'pick'}`} scope={route.params[0]} />; tab = 'practice'; break;
      case 'glossary': screen = <Glossary key={course.id} />; break;
      case 'profile': screen = <Profile />; break;
      default: screen = <Learn key={course.id} />; tab = 'learn';
    }
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <Header />
      {!isStorageAvailable() && (
        <p className="notice notice-warn" role="alert">Your browser is blocking storage, so progress won't be saved after you close this tab.</p>
      )}
      <main id="main" className="main" tabIndex={-1}>
        {screen}
      </main>
      <BottomNav active={tab} />
      <PasswordRecovery />
      <AccountNotice />
    </div>
  );
}
