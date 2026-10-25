import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { buttonRecipe, cn } from './bevel'
import { Icon } from './Icon'
import { moveFocus } from './rovingFocus'

export interface MenuItem {
  type?: 'item'
  label: React.ReactNode
  icon?: LucideIcon
  onSelect?: () => void
  disabled?: boolean
  /** Render the label in the "destructive" colour. */
  danger?: boolean
}
export interface MenuItemSeparator {
  type: 'separator'
}
export type MenuItemDef = MenuItem | MenuItemSeparator

const ITEM = '[role="menuitem"]'

/**
 * A single dropdown button (unlike `MenuBar`, which is a whole strip). Used for
 * "More Actions ▾" style overflow menus in detail panels.
 *
 * Keyboard: Enter / Space / ArrowDown on the button opens it on the first item,
 * ArrowUp on the last. A mouse click opens it with focus on the list itself, so
 * no item looks selected until the pointer or an arrow key reaches one; arrows, Home and End move; Escape closes back to the
 * button; Tab closes. Disabled items stay focusable (`aria-disabled`) so a
 * screen reader still reads them, including any reason in the label.
 */
export function Menu({
  label,
  items,
  align = 'end',
  disabled,
  className,
}: {
  label: React.ReactNode
  items: MenuItemDef[]
  align?: 'start' | 'end'
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  // which item to focus once the list renders
  const [focusOn, setFocusOn] = React.useState<'first' | 'last' | 'list'>(
    'first',
  )
  const ref = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const menuId = React.useId()

  const close = React.useCallback((refocus: boolean) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    if (focusOn === 'list') {
      listRef.current?.focus()
      return
    }
    const all = listRef.current?.querySelectorAll<HTMLElement>(ITEM)
    if (!all?.length) return
    ;(focusOn === 'first' ? all[0] : all[all.length - 1]).focus()
  }, [open, focusOn])

  const openAt = (where: 'first' | 'last' | 'list') => {
    setFocusOn(where)
    setOpen(true)
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-pressed={open || undefined}
        // `detail` is 0 for a keyboard-activated click (Enter / Space)
        onClick={(e) =>
          open ? setOpen(false) : openAt(e.detail === 0 ? 'first' : 'list')
        }
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            openAt(e.key === 'ArrowDown' ? 'first' : 'last')
          }
        }}
        className={cn(
          'min-h-[23px] min-w-0 px-2',
          buttonRecipe({ pressed: open, block: false, disabled: !!disabled }),
        )}
      >
        {label}
        <span aria-hidden className="text-[10px] leading-none">
          ▾
        </span>
      </button>
      {open ? (
        <ul
          ref={listRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              close(true)
            } else if (e.key === 'Tab') {
              close(false)
            } else if (moveFocus(listRef.current, ITEM, e.key)) {
              e.preventDefault()
            }
          }}
          className={cn(
            'ui-menu absolute top-full z-50 mt-[1px] min-w-[190px] outline-none',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((entry, i) => {
            if (entry.type === 'separator') {
              return (
                <li key={i} role="separator" className="ui-menu-sep my-1 h-px" />
              )
            }
            return (
              <li key={i} role="none">
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-disabled={entry.disabled || undefined}
                  data-danger={entry.danger || undefined}
                  className="ui-menu-item flex w-full items-center gap-2 px-3 py-[3px] text-left text-base whitespace-nowrap"
                  onClick={() => {
                    if (entry.disabled) return
                    // back on the button first, so a dialog the item opens
                    // returns focus here when it closes
                    close(true)
                    entry.onSelect?.()
                  }}
                >
                  <span className="ui-menu-lead grid shrink-0 place-items-center empty:hidden">
                    {entry.icon ? <Icon icon={entry.icon} size={14} /> : null}
                  </span>
                  <span>{entry.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
