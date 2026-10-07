import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import styles from './messages.module.css';

export interface Message {
  text: string;
  tone?: 'ok' | 'error' | 'info';
  /** Кнопка в сообщении: «Вернуть», «Добавить в календарь». */
  action?: { label: string; onClick: () => void };
}

type ShowMessage = (message: Message) => void;

const MessageContext = createContext<ShowMessage>(() => undefined);

export const useMessage = (): ShowMessage => useContext(MessageContext);

const HIDE_AFTER_MS = 6000;
const HIDE_WITH_ACTION_MS = 9000;

/** Сообщения внизу экрана: видны и на телефоне, где панель результата ниже вопросов. */
export function MessageProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<(Message & { key: number }) | null>(null);
  const show = useCallback<ShowMessage>(next => setMessage({ ...next, key: Date.now() }), []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(null), message.action ? HIDE_WITH_ACTION_MS : HIDE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <MessageContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite" aria-label="Сообщение" data-testid="toast">
        {message && (
          <div key={message.key} className={[styles.toast, styles[message.tone ?? 'info']].join(' ')}>
            <div className={styles.content}>
              <span className={styles.text}>{message.text}</span>
              {message.action && (
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => {
                    message.action?.onClick();
                    setMessage(null);
                  }}
                >
                  {message.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              className={styles.close}
              aria-label="Закрыть сообщение"
              onClick={() => setMessage(null)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
      </div>
    </MessageContext.Provider>
  );
}
