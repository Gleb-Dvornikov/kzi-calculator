import { useEffect, useRef, useState, type Dispatch } from 'react';
import { CONTACTS } from '../config';
import { formatKzi, formatUzi } from '../domain/common/format';
import type { Mode } from '../domain/mode';
import { KziPanel } from '../features/kzi/KziPanel';
import { KziView } from '../features/kzi/KziView';
import { UziPanel } from '../features/uzi/UziPanel';
import { UziView } from '../features/uzi/UziView';
import type { Action } from '../state/reducer';
import { modeFromHash, useAppState, useDispatch, useKziResult, useUziResult } from '../state/store';
import styles from './App.module.css';
import { MobileBar } from './MobileBar';
import { ModeSwitch } from './ModeSwitch';
import { RequisitesDialog } from './RequisitesDialog';
import { Topbar } from './Topbar';
import { useReports } from './ReportsContext';

const RESULT_ID = 'result';

/** Режим в адресе страницы: ссылка .../#uzi открывает калькулятор Узи. */
function useHashMode(mode: Mode, dispatch: Dispatch<Action>) {
  useEffect(() => {
    if (modeFromHash(window.location.hash) !== mode) {
      window.history.replaceState(null, '', `#${mode}`);
    }
  }, [mode]);

  useEffect(() => {
    const onHashChange = () => {
      const next = modeFromHash(window.location.hash);
      if (next) dispatch({ type: 'mode/set', mode: next });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [dispatch]);
}

export function App() {
  const { mode } = useAppState();
  const dispatch = useDispatch();
  const kzi = useKziResult();
  const uzi = useUziResult();
  const { busy, generate } = useReports();
  const [dialogOpen, setDialogOpen] = useState(false);
  const switchRef = useRef<HTMLDivElement>(null);

  const setMode = (next: Mode) => {
    if (next === mode) return;
    dispatch({ type: 'mode/set', mode: next });
    // Если пользователь прокрутил вниз, возвращаем его к началу выбранного режима
    const top = switchRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) switchRef.current?.scrollIntoView({ block: 'start' });
  };
  useHashMode(mode, dispatch);

  const openDialog = () => setDialogOpen(true);
  const mobile =
    mode === 'kzi'
      ? {
          label: 'Кзи',
          value: formatKzi(kzi.value),
          tag: kzi.hasAnswers ? { tone: kzi.level.tone, text: kzi.level.name } : null,
        }
      : {
          label: 'Узи',
          value: formatUzi(uzi.value),
          tag: uzi.answered > 0 && uzi.level ? { tone: uzi.level.tone, text: uzi.level.name } : null,
        };

  return (
    <>
      <Topbar />
      <div className={styles.layout}>
        <main className={styles.main}>
          <div ref={switchRef} className={styles.switch}>
            <ModeSwitch mode={mode} onChange={setMode} />
          </div>
          {mode === 'kzi' ? <KziView /> : <UziView />}
        </main>
        <aside className={styles.aside} id={RESULT_ID} aria-label="Результат расчета">
          {mode === 'kzi' ? <KziPanel onReport={openDialog} /> : <UziPanel onReport={openDialog} />}
        </aside>
      </div>
      <footer className={styles.footer}>
        Разработано:{' '}
        <a href={CONTACTS.site} target="_blank" rel="noopener noreferrer">
          {CONTACTS.companyFull} ({CONTACTS.company})
        </a>
        , {new Date().getFullYear()}
      </footer>
      <MobileBar label={mobile.label} value={mobile.value} tag={mobile.tag} targetId={RESULT_ID} />
      <RequisitesDialog
        open={dialogOpen}
        mode={mode}
        busy={busy}
        onClose={() => setDialogOpen(false)}
        onConfirm={() => {
          setDialogOpen(false);
          void generate(mode === 'kzi' ? 'kziLetter' : 'uziFull');
        }}
      />
    </>
  );
}
