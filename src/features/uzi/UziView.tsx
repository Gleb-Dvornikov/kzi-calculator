import { PageHeader } from '../../app/PageHeader';
import { InfoSection } from '../../components/InfoSection';
import { useAppState, useDispatch, useUziResult } from '../../state/store';
import viewStyles from '../shared/view.module.css';
import { DirectionSection } from './DirectionSection';
import { TargetSelect } from './TargetSelect';
import { UziAbout, UziUseful } from './UziInfo';

/** Основная колонка режима Узи. */
export function UziView() {
  const { ui } = useAppState();
  const dispatch = useDispatch();
  const result = useUziResult();

  return (
    <>
      <PageHeader
        mode="uzi"
        title="Калькулятор уровня зрелости"
        subtitle="Самооценка уровня зрелости деятельности в области технической защиты информации (Узи) по Методике Федеральной службы по техническому и экспортному контролю (ФСТЭК России) от 07.08.2026 для подтверждения уровня перед Заказчиком"
      />
      <InfoSection
        title="Информация о калькуляторе"
        open={ui.sections.uziAbout}
        onToggle={open => dispatch({ type: 'ui/section', key: 'uziAbout', open })}
      >
        <UziAbout />
      </InfoSection>
      <TargetSelect />
      <div className={viewStyles.groups}>
        {result.directions.map(direction => (
          <DirectionSection key={direction.direction.id} result={direction} target={result.target} />
        ))}
      </div>
      <InfoSection
        title="Полезная информация"
        open={ui.sections.uziUseful}
        onToggle={open => dispatch({ type: 'ui/section', key: 'uziUseful', open })}
      >
        <UziUseful />
      </InfoSection>
    </>
  );
}
