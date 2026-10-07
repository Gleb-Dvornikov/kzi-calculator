// Модули, которые подключает сборщик esbuild

/** CSS-модуль: имена классов уникальны для файла. */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

/** Глобальные стили. */
declare module '*.css';

/** SVG встраивается в сборку как data URL: импорт возвращает строку для src. */
declare module '*.svg' {
  const url: string;
  export default url;
}

/** Шрифт копируется в assets/ с хешем в имени, импорт возвращает путь к нему. */
declare module '*.woff' {
  const url: string;
  export default url;
}
