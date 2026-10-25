# Changelog

All notable changes to ovc-frontend. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/). Each version is a git tag
(`0.1.2`, no `v` prefix) with a matching GitHub Release and container image
(`ghcr.io/openvcenter/ovc-frontend:<version>`).

## [Unreleased]

## [0.4.0] - 2026-10-25

### Added

- Keyboard access across the console: tabs, menus and the Configuration section
  list move with the arrow keys; table rows that open something (cluster hosts,
  templates) open with Enter; dialogs take focus when they open, keep Tab inside
  and give focus back when they close.
- Batch Shut Down in the VM grid, next to Turn Off, so a group of VMs can be shut
  down gracefully.
- A folder lists its VMs in the VM grid, with search, state and snapshot filters,
  batch power actions and a Host column for cluster folders.
- The VM grid's state filter has "Unknown", to find VMs left on an offline host.
- Edit Notes button on the VM Summary.
- Setup Agent tab: numbered install steps and a "waiting for the agent" line. The
  host is checked every 5 seconds while the tab is open, and the status bar says
  when the agent checks in.
- The console's connecting screen shows each real step of the connection.

### Changed

- Batch power uses the same labels, icons and confirmations as the VM header
  (Start, Shut Down, Turn Off). Turn Off warns that unsaved data will be lost.
- Shut Down asks for confirmation in the VM header too, as it already did in the
  console. The console toolbar follows the same power rules as the header.
- Snapshot actions are disabled while the VM is locked, its host is offline or it
  is changing state, with a notice saying why. Restore is a danger prompt that
  says the current state will be lost.
- Destructive prompts open with Cancel focused. Remove from Inventory and Force
  unlock are shown as danger items.
- VM action dialogs keep OK disabled while the request runs and show a failed
  request's error inside the dialog. Edit VM ignores a stray backdrop click or
  Escape while it has unsaved changes.
- Edit VM explains that CPU, memory, nested virtualization, Secure Boot and
  automatic stop can only change while the VM is off.
- VM and host state icons in every table; the VM grid is as dense as the other
  tables.
- Clone VM is shown disabled, instead of hidden, while the VM is running.
- Delete is set apart from the other power buttons.
- VM Startup Ordering numbers VMs that start together with the same position,
  and a host's Configuration no longer repeats the Host column.
- Explanatory and empty-state text uses the normal text colour instead of the
  low-contrast grey.
- Folder and cluster views load only the VMs they show instead of the whole fleet.

### Fixed

- Metric chart axis labels such as "2.4 MB/s" no longer wrap or get cut off.
- Pressing Escape in a confirmation opened over another dialog no longer closes
  both.

### Removed

- The duplicate State row in the VM Summary and the Agent row in the Host Summary
  (the header and the Status row already show them).

## [0.3.0] - 2026-10-17

### Added

- "VMware Nostalgia" theme: the vSphere HTML5 Client look, after VMware's
  Clarity Design System. Pick it on the login screen or in Preferences ▸ Theme.
- "Classic MacOS" theme: the Mac OS 9 Platinum look, based on the stylesheet of
  wieslawsoltes/MacOS9.
- "16bit Overload" theme: the look of 16-bit console games, after snes.css.

### Changed

- Windows 7 is the default theme for new browsers (it was Windows Classic). A
  theme you already picked is kept.
- The theme list is sorted alphabetically.
- VM Summary: the Advanced box is folded into the other boxes. Config path,
  Mounted ISO and Host move to Virtual Machine Information; Secure Boot, nested
  virtualization, HA and automatic start/stop move to Configuration.
- New Open vCenter logo on the login screen and in the About dialog, and new
  favicons and app icons.
- The About dialog links to the project's new home,
  github.com/openvcenter/Open-vCenter. Images are now published as
  `ghcr.io/openvcenter/ovc-frontend`.

### Removed

- View ▸ Task History and the Tasks tab on hosts and VMs: the Events screens
  (admin) are the history now, and Event Details ▸ View Task opens the task.
  Everyone keeps the Recent Tasks dock.

## [0.2.0] - 2026-10-03

### Added

- The About dialog shows the app version.
- Audit log (admin only): View ▸ Events History and an Events tab on clusters,
  hosts and VMs show who changed what and when, with the outcome of agent tasks
  and the before/after of each change. Needs ovc-backend 0.2.0
  (`GET /audit-events`).

### Changed

- Menu items no longer end with an ellipsis (menu bar, VM More ▾, host
  Actions ▾).
- An Off VM's console preview shows "No preview - VM is off" instead of its
  last, stale thumbnail.

## [0.1.2] - 2026-10-03

### Added

- VM tags with categories and colours: File ▸ Tag Management (admin), and
  Summary ▸ Tags ▸ Assign Tag… on each VM.
- VM search dialog in the tree toolbar.
- VM Summary Console box: last console thumbnail, Open Web Console and
  Download RDP; Configuration shows guest OS and provisioned space.
- Host actions menu, host Configuration tab and storage placement rules.
- Theme options.

### Changed

- Consoles connect straight to guacd: the frontend serves the Guacamole
  tunnel itself (`GUACD_URL`, default `localhost:4822`), so ovc-webrdp is no
  longer required. Opening a console needs a signed-in session; audio, file
  transfer and printing are always disabled.
- The tree lists a cluster's hosts before its Templates folder.
- An Off or Paused VM has no console (Console tab and buttons disabled).

### Fixed

- Agent binary upload accepts only `.exe` files.
- About dialog, folder scope, and the Move button when no folder is
  available.

## [0.1.1] - 2026-09-20

### Changed

- The webrdp base URL became a server-side runtime variable instead of a
  build-time one.

## [0.1.0] - 2026-09-20

First public release.

[Unreleased]: https://github.com/openvcenter/Open-vCenter-Frontend/compare/0.4.0...HEAD
[0.4.0]: https://github.com/openvcenter/Open-vCenter-Frontend/compare/0.3.0...0.4.0
[0.3.0]: https://github.com/openvcenter/Open-vCenter-Frontend/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/openvcenter/Open-vCenter-Frontend/compare/0.1.2...0.2.0
[0.1.2]: https://github.com/openvcenter/Open-vCenter-Frontend/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/openvcenter/Open-vCenter-Frontend/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/openvcenter/Open-vCenter-Frontend/releases/tag/0.1.0
