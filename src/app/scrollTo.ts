/** Прокручивает к элементу после обновления страницы и коротко подсвечивает его. */
export function scrollToElement(id: string, options: { flash?: boolean } = {}): void {
  window.setTimeout(() => {
    const element = document.getElementById(id);
    if (!element) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (options.flash) {
      element.classList.remove('is-flash');
      // Перезапуск анимации подсветки
      void element.offsetWidth;
      element.classList.add('is-flash');
      window.setTimeout(() => element.classList.remove('is-flash'), 1700);
    }
  }, 30);
}
