import { useRef } from 'react';
import logoUrl from '../assets/logo.svg';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import styles from './Topbar.module.css';
import { useStateFile } from './useStateFile';

export function Topbar() {
  const { save, load } = useStateFile();
  const input = useRef<HTMLInputElement>(null);

  return (
    <header className={styles.topbar}>
      <a className={styles.logo} href="./">
        <img src={logoUrl} alt="CheckU" width={200} height={30} />
      </a>
      <div className={styles.files}>
        <div className={styles.buttons}>
          <Button
            size="sm"
            variant="outline"
            icon={<Icon name="download" />}
            onClick={save}
            aria-label="Сохранить в файл"
            title="Сохранить ответы и реквизиты в файл на компьютере"
          >
            <span className={styles.label}>Сохранить в файл</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<Icon name="upload" />}
            onClick={() => input.current?.click()}
            aria-label="Загрузить из файла"
            title="Загрузить ответы и реквизиты из сохраненного файла"
          >
            <span className={styles.label}>Загрузить из файла</span>
          </Button>
          <input
            ref={input}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void load(file);
            }}
          />
        </div>
        <p className={styles.note}>Данные никуда не отправляются, файл хранится только у вас</p>
      </div>
    </header>
  );
}
