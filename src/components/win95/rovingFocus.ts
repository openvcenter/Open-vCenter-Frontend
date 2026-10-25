/**
 * Arrow-key focus movement for composite widgets (menus, tab strips, list
 * boxes): one Tab stop for the widget, arrows move between its items. Returns
 * true when the key was handled, so the caller can `preventDefault()`.
 */
export function moveFocus(
  container: HTMLElement | null,
  selector: string,
  key: string,
  orientation: 'vertical' | 'horizontal' = 'vertical',
): boolean {
  if (!container) return false
  const prev = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
  const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
  if (![prev, next, 'Home', 'End'].includes(key)) return false
  const items = [...container.querySelectorAll<HTMLElement>(selector)]
  if (!items.length) return false
  const i = items.indexOf(document.activeElement as HTMLElement)
  let target: number
  if (key === 'Home') target = 0
  else if (key === 'End') target = items.length - 1
  else if (i < 0) target = key === next ? 0 : items.length - 1
  else if (key === next) target = (i + 1) % items.length
  else target = (i - 1 + items.length) % items.length
  items[target].focus()
  return true
}
