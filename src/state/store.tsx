import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';
import { calculateKzi, type KziResult } from '../domain/kzi/calculate';
import { isMode, type Mode } from '../domain/mode';
import { calculateUzi, type UziResult } from '../domain/uzi/calculate';
import { reducer, type Action } from './reducer';
import { loadState, saveState } from './storage';
import type { AppState } from './types';

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

/** Режим из адреса страницы: #kzi или #uzi. */
export function modeFromHash(hash: string): Mode | null {
  const value = hash.replace(/^#/, '').toLowerCase();
  return isMode(value) ? value : null;
}

function initialState(): AppState {
  const { state } = loadState();
  const mode = typeof window !== 'undefined' ? modeFromHash(window.location.hash) : null;
  return mode ? { ...state, mode } : state;
}

const SAVE_DELAY_MS = 150;

export function AppStateProvider({ children, initial }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(reducer, initial ?? null, value => value ?? initialState());
  const latest = useRef(state);

  // Ответы сохраняются в браузере с небольшой задержкой и сразу при закрытии страницы
  useEffect(() => {
    latest.current = state;
    const timer = window.setTimeout(() => saveState(state), SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const flush = () => saveState(latest.current);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </DispatchContext.Provider>
  );
}

export function useAppState(): AppState {
  const state = useContext(StateContext);
  if (!state) throw new Error('useAppState используется вне AppStateProvider');
  return state;
}

export function useDispatch(): Dispatch<Action> {
  const dispatch = useContext(DispatchContext);
  if (!dispatch) throw new Error('useDispatch используется вне AppStateProvider');
  return dispatch;
}

export function useKziResult(): KziResult {
  const { kzi } = useAppState();
  return useMemo(() => calculateKzi(kzi), [kzi]);
}

export function useUziResult(): UziResult {
  const { uzi } = useAppState();
  return useMemo(() => calculateUzi(uzi), [uzi]);
}
