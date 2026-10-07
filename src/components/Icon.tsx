/** Иконки интерфейса: линейные, 24x24, цвет берется из currentColor. */
const PATHS = {
  tick: 'M5 12.5 10 17.5 19.5 7',
  download: 'M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14',
  upload: 'M12 19V8m0 0-4.5 4.5M12 8l4.5 4.5M5 5h14',
  calendar:
    'M7 3v3m10-3v3M4.5 9h15M6 5h12a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 6 5Z',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  paperclip: 'M20 11.5 12.4 19a5 5 0 0 1-7.1-7.1l7.9-7.9a3.4 3.4 0 0 1 4.8 4.8l-7.9 7.9a1.7 1.7 0 0 1-2.4-2.4l7.2-7.2',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, strokeWidth = 2 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
