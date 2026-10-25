import * as React from 'react'
import { cn } from './bevel'
import { Window } from './Window'

// Open dialogs, innermost last. Only the top one reacts to Escape and traps Tab,
// so a confirm opened over Edit VM doesn't close both.
const stack: symbol[] = []

const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/**
 * A modal dialog. Renders a centred window over a dim backdrop.
 * `onClose` fires on the ✕ button, the backdrop, and Escape. While `dirty`, the
 * backdrop and Escape are ignored so unsaved input survives a stray click; ✕ and
 * the dialog's own Cancel still close it.
 *
 * Focus moves into the dialog on open (an `autoFocus` field, else the element
 * marked `data-autofocus`, else the first control in the body), Tab stays inside,
 * and focus returns to the opener on close. `error` renders inline above the
 * footer, next to the action that failed.
 */
export function Dialog({
  title,
  onClose,
  children,
  footer,
  error,
  dirty = false,
  width = 340,
}: {
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  error?: React.ReactNode
  dirty?: boolean
  width?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  const onCloseRef = React.useRef(onClose)
  onCloseRef.current = onClose
  const dirtyRef = React.useRef(dirty)
  dirtyRef.current = dirty

  React.useEffect(() => {
    const id = Symbol('dialog')
    stack.push(id)
    const opener = document.activeElement as HTMLElement | null
    const root = ref.current

    if (root && !root.contains(document.activeElement)) {
      const body = root.querySelector<HTMLElement>('[data-dialog-body]')
      const target =
        root.querySelector<HTMLElement>('[data-autofocus]') ??
        body?.querySelector<HTMLElement>(FOCUSABLE) ??
        root.querySelector<HTMLElement>('[data-dialog-footer] button:not(:disabled)')
      target?.focus()
    }

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id || !root) return
      if (e.key === 'Escape') {
        if (!dirtyRef.current) onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      } else if (!root.contains(document.activeElement)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      stack.splice(stack.indexOf(id), 1)
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-backdrop/20"
      onMouseDown={(e) => e.target === e.currentTarget && !dirty && onClose()}
    >
      <Window
        ref={ref}
        title={title}
        titleId={titleId}
        onClose={onClose}
        style={{ width }}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
      >
        <div data-dialog-body className="p-4">
          {children}
        </div>
        {error ? (
          <p role="alert" className="mx-4 -mt-1 mb-3 text-danger">
            {error}
          </p>
        ) : null}
        {footer ? (
          <div
            data-dialog-footer
            className={cn('flex justify-end gap-2 px-4 pb-3')}
          >
            {footer}
          </div>
        ) : null}
      </Window>
    </div>
  )
}
