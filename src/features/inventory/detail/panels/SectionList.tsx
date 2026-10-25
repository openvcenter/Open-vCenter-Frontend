import * as React from "react";
import type { ReactNode } from "react";
import { cn, moveFocus } from "~/components/win95";

export interface Section {
  id: string;
  label: string;
}

/**
 * A list-box of sections on the left, the selected section's content on the
 * right - the vertical-tab layout of the host / cluster "Configuration" tab.
 * One Tab stop; Up / Down / Home / End move and select, like a Windows list box.
 */
export function SectionList({
  sections,
  value,
  onChange,
  children,
}: {
  sections: Section[];
  value: string;
  onChange: (id: string) => void;
  children: ReactNode;
}) {
  const listRef = React.useRef<HTMLUListElement>(null);

  return (
    <div className="flex min-h-0 gap-3">
      <ul
        ref={listRef}
        role="listbox"
        aria-label="Sections"
        onKeyDown={(e) => {
          if (moveFocus(listRef.current, '[role="option"]', e.key)) {
            e.preventDefault();
            const id = (document.activeElement as HTMLElement).dataset.id;
            if (id) onChange(id);
          }
        }}
        className="ui-field w-52 shrink-0 self-start bg-window p-0.5 text-base"
      >
        {sections.map((s) => (
          <li
            key={s.id}
            role="option"
            data-id={s.id}
            tabIndex={s.id === value ? 0 : -1}
            aria-selected={s.id === value}
            onClick={() => onChange(s.id)}
            className={cn(
              "cursor-default select-none px-2 py-0.5",
              s.id === value && "bg-selection text-selection-text",
            )}
          >
            {s.label}
          </li>
        ))}
      </ul>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
