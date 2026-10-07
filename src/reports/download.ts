/** Сохраняет файл на компьютер пользователя через ссылку со свойством download. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadText(content: string, fileName: string, type: string): void {
  downloadBlob(new Blob([content], { type }), fileName);
}
