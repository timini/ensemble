/**
 * Moves focus between the enabled elements matching `selector` inside
 * `container` for ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home and End.
 * Returns the newly focused index, or -1 when the key is not handled.
 *
 * `orientation` picks which arrow pair is used. Focus wraps at the ends.
 */
export function moveFocus(
  container: HTMLElement | null,
  selector: string,
  key: string,
  orientation: 'vertical' | 'horizontal' = 'vertical',
): number {
  if (!container) return -1;
  const items = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !(el as HTMLButtonElement).disabled,
  );
  if (items.length === 0) return -1;
  const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
  const prev = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
  const current = items.indexOf(document.activeElement as HTMLElement);
  let index: number;
  if (key === next) index = current < 0 ? 0 : (current + 1) % items.length;
  else if (key === prev) index = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
  else if (key === 'Home') index = 0;
  else if (key === 'End') index = items.length - 1;
  else return -1;
  items[index]?.focus();
  return index;
}
