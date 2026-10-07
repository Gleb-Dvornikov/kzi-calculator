import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Tag, type TagTone } from '../components/Tag';
import { scrollToElement } from './scrollTo';
import styles from './MobileBar.module.css';

/** Нижняя плашка на телефоне: значение всегда на виду, пока панель результата за пределами экрана. */
export function MobileBar({
  label,
  value,
  tag,
  targetId,
}: {
  label: string;
  value: string;
  tag: { tone: TagTone; text: string } | null;
  targetId: string;
}) {
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(entries => setPanelVisible(entries.some(entry => entry.isIntersecting)), {
      threshold: 0.05,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div className={[styles.bar, panelVisible ? styles.hidden : ''].join(' ')}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {tag && (
        <Tag tone={tag.tone} size="sm">
          {tag.text}
        </Tag>
      )}
      <Button variant="dark" size="sm" className={styles.button} onClick={() => scrollToElement(targetId)}>
        К результату
      </Button>
    </div>
  );
}
