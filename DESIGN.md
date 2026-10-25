---
name: Open vCenter
description: A themable desktop-window console for running Hyper-V fleets from the browser.
colors:
  surface: "#c0c0c0"
  surface-2: "#dfdfdf"
  window: "#ffffff"
  fg: "#000000"
  bevel-light: "#ffffff"
  bevel-dark: "#808080"
  bevel-darker: "#000000"
  line: "#808080"
  title-active: "#000080"
  title-active-2: "#1084d0"
  title-inactive: "#808080"
  title-text: "#ffffff"
  selection: "#000080"
  selection-text: "#ffffff"
  disabled-text: "#808080"
  link: "#0000ee"
  accent: "#000080"
  success: "#008000"
  danger: "#c00000"
  warning: "#b8860b"
  info: "#4169e1"
  running: "#00007b"
  notice-bg: "#fff8e0"
  notice-text: "#7a5a00"
  danger-bg: "#ffecec"
  info-bg: "#e8f0ff"
  chart-1: "#008000"
  chart-2: "#000080"
  chart-3: "#008080"
  chart-4: "#a000a0"
  chart-5: "#c00000"
  console-bg: "#000000"
  console-fg: "#00ff00"
  backdrop: "#000000"
typography:
  title:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Helvetica Neue, Tahoma, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.4
  body-lg:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Helvetica Neue, Tahoma, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  body:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Helvetica Neue, Tahoma, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Helvetica Neue, Tahoma, Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 400
  mono:
    fontFamily: "ui-monospace, SF Mono, Cascadia Code, JetBrains Mono, Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  none: "0px"
spacing:
  "1": "4px"
  "1.5": "6px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "3px 12px"
    height: "23px"
    width: "75px"
  button-disabled:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.disabled-text}"
  field:
    backgroundColor: "{colors.window}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
  titlebar:
    backgroundColor: "{colors.title-active}"
    textColor: "{colors.title-text}"
    typography: "{typography.title}"
    height: "22px"
    padding: "2px 3px"
  titlebar-inactive:
    backgroundColor: "{colors.title-inactive}"
    textColor: "{colors.surface-2}"
  menu-item-hover:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.selection-text}"
  tree-row-selected:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.selection-text}"
  statusbar-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    width: "340px"
    padding: "16px"
---

# Design System: Open vCenter

## Overview

**Creative North Star: "The Operator's Console"**

Open vCenter is a control surface for people who run a fleet of hosts and VMs all
day. It is one desktop window: menu bar, a split pane with the inventory tree on the
left and detail tabs on the right, a Recent Tasks dock and a status bar. The retro
OS chrome is there because operators recognise it and know how to use it, not for
nostalgia. Every screen favours density, scanability and visible state over
expression.

The window's structure is fixed, and eight themes reskin it: Windows Classic, Windows
XP, Windows 7 (the default users see), Classic MacOS, 16bit Overload, VMware
Nostalgia, and Modern Light and Dark. Each theme evokes its era, but consistency and
readability across the app come before historical accuracy. A theme is CSS only: it
redefines tokens under `:root[data-theme='<id>']`, with rare structural overrides.
`src/styles/app.css` holds the full token contract in **Windows Classic values**,
and the tokens in this file are that contract. Build against the semantic tokens and
the `ui-*` classes, and the other themes follow automatically.

Controls are tactile and plain. Buttons look pressable and fields look editable.
There is no ornament beyond the theme's own chrome: bevels or borders, never
decoration. The system rejects the SaaS-dashboard look (card grids, big KPI tiles,
hero numbers, gradient accents) and mobile-first layouts. The Explorer is a
desktop window.

**Key Characteristics:**
- One Explorer window with a fixed structure; themes change the skin, never the layout.
- Compact 12px UI type and 23px controls, built for dense inventories.
- Depth comes from inset bevels (Classic) or hairline borders (flat themes), not floating shadows.
- Status is shown in colour and position: transport-style VM state icons, Recent Tasks and the status bar.
- Semantic tokens only; one Classic value per token, with each theme overriding.

## Colors

The Classic palette is Windows 95 system colours: ButtonFace grey chrome, white
wells, navy for titles and selection, and saturated status colours used sparingly
for state.

### Primary
- **Title Navy** (#000080): active title bar (gradient to **Title Sky** #1084d0),
  selection fills in trees, menus and lists, the progress fill and emphasised text
  (`accent`). It is the only chrome accent.

### Neutral
- **ButtonFace Grey** (#c0c0c0, `surface`): window and dialog bodies, buttons,
  toolbars, menus, the status bar.
- **Pressed Grey** (#dfdfdf, `surface-2`): inner bevel highlight, pressed and
  toggled-on fills.
- **Well White** (#ffffff, `window`): editable fields, list and tree wells, the grid.
- **Ink** (#000000, `fg`): default text.
- **Bevel Shadow** (#808080, `bevel-dark`/`line`) and **Bevel Black** (#000000,
  `bevel-darker`): the lower-right edges of bevels and the 1px borders in flat themes.
- **Disabled Grey** (#808080, `disabled-text`): disabled text and muted labels.

### Status (semantic)
- **Running Green** (#008000, `success`), **Alarm Red** (#c00000, `danger`),
  **Caution Amber** (#b8860b, `warning`), **Signal Blue** (#4169e1, `info`).
- Row tints: `danger-bg` #ffecec (marked for removal), `info-bg` #e8f0ff (marked for
  change), `notice-bg` #fff8e0 with `notice-text` #7a5a00 (inline notices).
- Charts: `chart-1`…`chart-5` (green, navy, teal, purple, red).
- Tags pick from a fixed 10-colour data palette (`--color-tag-<name>` + `-fg`).
  They are data colours, not chrome.
- Console: `console-bg` #000000 with phosphor-green `console-fg` #00ff00. The
  console is a screen, not chrome, so themes leave it alone.

### Named Rules
**The Semantic Token Rule.** Feature code uses semantic utilities (`text-success`,
`bg-window`, `bg-backdrop/20`, `var(--color-chart-N)`) and never raw hex,
`black`/`white` utilities or hard-coded chrome. Code never branches on the theme id
(`ScrollArea` is the only exception). A new token needs a Classic value in
`app.css`.

**The Transport Icon Rule.** VM state is always the transport set: `Play` green,
`Square` red, `Pause` amber, Saved = blue `Square`, Unknown = grey `Square`, and
transitional states use the same icon with `animate-pulse`. Reuse
`tree/nodeIcons.tsx` and `actions/powerActions.ts`.

## Typography

**UI Font:** Segoe UI (falling back to San Francisco, Roboto, Helvetica Neue,
Tahoma, Arial)
**Mono Font:** ui-monospace (SF Mono, Cascadia Code, JetBrains Mono, Menlo, Consolas)

**Character:** The native OS UI face at desktop-application size: crisp, small and
neutral. Themes may swap the family (Tahoma on XP, Inter on Modern, Metropolis on
VMware, Geneva on Classic MacOS, Press Start 2P accents on 16bit). The sizes stay
the same.

### Hierarchy
- **Title** (700, 12px): window and dialog title bars.
- **Body Large** (400, 13px, `text-lg`): the few places that need a step up.
- **Body** (400, 12px, line-height 1.4, `text-base`): everything else: menus,
  buttons, tree, tabs, tables, fields, status bar.
- **Label** (400, 10px, `text-xs`): secondary captions and dense metadata.
- **Mono** (400, 12px): IDs, GUIDs, paths, logs.

### Named Rules
**The Desktop Scale Rule.** No display or headline sizes. Hierarchy comes from
position, weight, group boxes and tabs, not large type.

## Layout

The Explorer fills the viewport as one window above the theme's `--desktop-bg`. From
top to bottom: title bar, menu bar, a resizable split pane (tree toolbar and
inventory tree | detail pane with tabs), the Recent Tasks dock and the status bar
with sunken panels. Dialogs are centred windows (default 340px wide, 16px body
padding) over `bg-backdrop/20`.

Spacing follows Tailwind's 4px steps, kept tight: `gap-1` (4px) and `gap-2` (8px)
dominate, then `px-2`, `gap-3`/`p-3` (12px), and `p-4` (16px) for dialog bodies.
Icons are 13-16px (14px is the most common). Density is high on purpose: design
for large inventories, not a demo with ten VMs.

Layout is desktop-only. The split pane does not stack for mobile. Only form grids
inside dialogs or panels use `md:`/`lg:` column changes.

## Elevation & Depth

Classic depth is drawn, not cast. Inset box-shadow stacks (`--bevel-raised`,
`--bevel-sunken`, `--bevel-pressed`, their thin variants and `--bevel-window`)
make raised chrome and sunken wells without layout shift or extra DOM. The flat
themes (Windows 7, VMware, Modern) remap the same tokens to 1px hairlines and keep
real shadows for floating layers. The only cast shadow in the Classic contract is
the dropdown list box (`4px 4px 10px rgba(0,0,0,0.35)`).

### Shadow Vocabulary
- **Raised** (`--bevel-raised`): buttons, windows, menus, scrollbar thumbs.
- **Sunken** (`--bevel-sunken`): fields, tree and list wells, the progress well.
- **Pressed** (`--bevel-pressed`): the active or pressed button state.
- **Thin raised / thin sunken**: toolbars, the menu bar, status bar panels, splitter grips.

### Named Rules
**The Bevel Utility Rule.** Express depth with the `bevel-*` utilities or `ui-*`
classes, never with ad-hoc `shadow-*` utilities, so every theme can remap it.

## Shapes

Classic is square: every `--radius-*` and component radius is 0. Other themes put
real radii back through the same tokens (Windows 7: 2-12px with 7px windows; XP: 3px
buttons with 8px top-rounded windows; Modern: 6px buttons and 10px windows; VMware:
3px). Components read radii from tokens (`--btn-radius`, `--field-radius`,
`--panel-radius`, …), so shape always follows the theme. Group boxes use an engraved
5×5 border image from 98.css.

## Components

Each primitive lives in `src/components/win95/`: it owns its layout and takes its
visuals from the `ui-*` class and the theme tokens.

### Buttons
- **Character:** a physical push button.
- **Shape:** square in Classic (`--btn-radius`, 0px), with a minimum size of 75×23px.
- **Default:** `surface` fill, `fg` text, raised bevel, 3px × 12px padding, an
  optional 16px leading icon.
- **Hover / Focus:** hover keeps the bevel in Classic. Focus is a 1px dotted outline
  inset 4px.
- **Pressed:** `--bevel-pressed`, with a 1px text shift (Classic only, through the
  `classic:` variant). `pressed` forces the toggled-on look.
- **Disabled:** grey text with a white emboss (`--btn-disabled-text-shadow`).

### Inputs / Fields
- **Style:** a `window` white well with a sunken bevel (`--field-shadow`), square in
  Classic. `ui-field-thin` uses the thin bevel.
- **Focus:** themes may tighten the focus shadow (`--field-focus-shadow`). Classic
  keeps the bevel.
- **Combo box:** a raised arrow button (pressed while open) and a list box with a
  2px black border and the one cast shadow.

### Navigation
- **Menu bar:** text items on `surface`. An open item fills with `selection`. Menu
  labels never end in an ellipsis.
- **Menus:** a raised popup with 4px × 2px padding. Hovered items fill with
  `selection`, danger items use `danger` text, and separators are engraved
  (dark over light).
- **Tabs:** raised top-edge tabs over a thin-raised panel. Inactive tabs are at 0.9
  opacity.
- **Toolbar:** flat buttons that raise on hover, sink on press and stay sunken when
  on. Separators are engraved.

### Inventory Tree (signature)
A sunken white well with a 2px inset (`--tree-inset`) so row fills don't cover the
bevel. The selected row fills with `selection`. Expanders are boxed +/- glyphs, and
some themes draw them as chevrons. Node icons follow the Transport Icon Rule.

### Status Bar (signature)
A row of thin-sunken panels: a transient message ("Ready"), running task count,
selection, host/VM counts and the connection state (`● Connected` green,
`Refreshing…`, `● Disconnected` accent). Errors and outcomes are reported here with
`statusMessage.set(...)`, never with browser alerts.

### Dialogs
A centred `Window` with a title bar and close box over a 20% backdrop that closes it
on click or Escape. Confirmations go through `confirm()` / `confirmWithCheckbox`,
never `window.confirm`.

## Do's and Don'ts

### Do:
- **Do** build every new screen inside the Explorer structure (menu bar, tree,
  detail tabs, Recent Tasks, status bar) and with the `win95/` primitives.
- **Do** use semantic colour tokens, `ui-*` classes and `bevel-*` utilities, and
  give any new token a Classic value in `app.css`.
- **Do** check a visual change in all eight themes. Each one should evoke its era,
  but consistency and readability win over historical accuracy.
- **Do** keep controls tactile and plain: raised to press, sunken to edit, with
  12px body type and 23px controls.
- **Do** show asynchronous work as tasks and in the status bar, and VM state with
  the transport icon set.

### Don't:
- **Don't** use the SaaS dashboard look: card grids, big KPI tiles, hero numbers or
  gradient accents.
- **Don't** design mobile-first or stack the split pane responsively. This is a
  desktop window.
- **Don't** use raw hex, `black`/`white` utilities, ad-hoc `shadow-*` or
  theme-id branches in feature code.
- **Don't** add display-size type or ornament that isn't the theme's own chrome.
- **Don't** add trailing ellipses to menu labels or use `window.confirm` / `alert` /
  `prompt`.
