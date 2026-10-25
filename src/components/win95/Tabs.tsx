import * as React from 'react'
import { cn } from './bevel'
import { ScrollArea } from './ScrollArea'
import { moveFocus } from './rovingFocus'

export interface TabItem {
  id: string
  label: React.ReactNode
  /** Greyed out and not clickable; the parent should not leave it active. It
   *  stays reachable by arrow key so the `title` reason can still be read. */
  disabled?: boolean
  /** Tooltip and accessible description, e.g. why the tab is disabled. */
  title?: string
}

/**
 * Tab strip. Controlled: parent owns the active id (we keep it in the URL
 * so a selected detail tab is deep-linkable). The strip is one Tab stop;
 * Left / Right / Home / End move between tabs and select on arrival, the way
 * a Windows property sheet behaves.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  className,
  children,
}: {
  tabs: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
  children?: React.ReactNode
}) {
  const baseId = React.useId()
  const listRef = React.useRef<HTMLDivElement>(null)
  const tabId = (id: string) => `${baseId}-tab-${id}`

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div
        ref={listRef}
        role="tablist"
        className="relative z-10 flex gap-0.5 px-1"
        onKeyDown={(e) => {
          if (moveFocus(listRef.current, '[role="tab"]', e.key, 'horizontal')) {
            e.preventDefault()
            const id = (document.activeElement as HTMLElement).dataset.tabId
            const tab = tabs.find((t) => t.id === id)
            if (tab && !tab.disabled) onChange(tab.id)
          }
        }}
      >
        {tabs.map((tab) => {
          const active = tab.id === value
          return (
            <button
              key={tab.id}
              id={tabId(tab.id)}
              data-tab-id={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`${baseId}-panel`}
              aria-disabled={tab.disabled || undefined}
              tabIndex={active ? 0 : -1}
              title={tab.title}
              onClick={() => !tab.disabled && onChange(tab.id)}
              className={cn(
                'ui-tab px-3 pt-[3px] text-base select-none',
                active
                  ? 'relative -mb-px pb-[4px] pt-[4px]'
                  : 'mt-[2px] pb-[2px]',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {/* the role sits on the viewport itself: a wrapper div here would break
          the `h-full` chain of panels like the VM grid */}
      <ScrollArea
        className="ui-tab-panel min-h-0 flex-1"
        viewportClassName="p-3"
        viewportProps={{
          id: `${baseId}-panel`,
          role: "tabpanel",
          "aria-labelledby": tabId(value),
        }}
      >
        {children}
      </ScrollArea>
    </div>
  )
}
