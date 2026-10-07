import { PageHeader } from '../../app/PageHeader';
import { InfoSection } from '../../components/InfoSection';
import { useAppState, useDispatch, useKziResult } from '../../state/store';
import viewStyles from '../shared/view.module.css';
import { GroupSection } from './GroupSection';
import { KziAbout, KziUseful } from './KziInfo';
import { ZeroConditions } from './ZeroConditions';

/** Основная колонка режима Кзи. */
export function KziView() {
  const { ui } = useAppState();
  const dispatch = useDispatch();
  const result = useKziResult();

  return (
    <>
      <PageHeader
        mode="kzi"
        title="Калькулятор показателя защищенности"
        subtitle="Расчет показателя защищенности (Кзи) по Методике от 11.11.2025 и отчет для Федеральной службы по техническому и экспортному контролю (ФСТЭК России)"
      />
      <InfoSection
        title="Информация о калькуляторе"
        open={ui.sections.kziAbout}
        onToggle={open => dispatch({ type: 'ui/section', key: 'kziAbout', open })}
      >
        <KziAbout onOpenUzi={() => dispatch({ type: 'mode/set', mode: 'uzi' })} />
      </InfoSection>
      <div className={viewStyles.groups}>
        {result.groups.map(group => (
          <GroupSection key={group.group.id} result={group} />
        ))}
      </div>
      <ZeroConditions result={result} />
      <InfoSection
        title="Полезная информация"
        open={ui.sections.kziUseful}
        onToggle={open => dispatch({ type: 'ui/section', key: 'kziUseful', open })}
      >
        <KziUseful />
      </InfoSection>
    </>
  );
}
