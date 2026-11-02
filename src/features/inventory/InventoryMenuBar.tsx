import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { MenuBar } from '~/components/win95'
import type { MenuDef, MenuEntry } from '~/components/win95'
import { useAuth } from '~/auth'
import { objKey, useCan, useFolderOwnerKey, usePrivileges } from './rbac/privileges'
import { THEMES, TREE_BEHAVIORS, useTheme, useTreeBehavior } from '~/preferences'
import { useInventorySelection } from './selection'
import { organizeDialog } from './organize/dialogStore'
import { useVmFolderTargets } from './organize/scope'
import { VmLocksDialog } from './locks/VmLocksDialog'
import { EventsHistoryDialog } from './events/EventsHistoryDialog'
import { AboutDialog } from './AboutDialog'
import { AuthDebugDialog } from './AuthDebugDialog'

export function InventoryMenuBar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const auth = useAuth()
  const global = usePrivileges('global')
  const [aboutOpen, setAboutOpen] = React.useState(false)
  const [locksOpen, setLocksOpen] = React.useState(false)
  const [eventsOpen, setEventsOpen] = React.useState(false)
  const [authDebugOpen, setAuthDebugOpen] = React.useState(false)
  const { selection } = useInventorySelection()
  const canMoveVm = useCan('vm.config', selection?.kind === 'vm' ? objKey('vm', selection.id) : null)
  const canDeleteFolder = useCan(
    'folder.manage',
    useFolderOwnerKey(selection?.kind === 'folder' ? selection.id : null),
  )
  const vmFolders = useVmFolderTargets(selection?.kind === 'vm' ? selection.id : undefined)
  const { theme, setTheme } = useTheme()
  const { treeBehavior, setTreeBehavior } = useTreeBehavior()

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        {
          label: 'Cluster Management',
          onSelect: () => organizeDialog.open({ kind: 'cluster-management' }),
        },
        {
          label: 'Hosts Management',
          onSelect: () => organizeDialog.open({ kind: 'host-management' }),
        },
        {
          label: 'Agent Management',
          disabled: !global.can('host.manage'),
          onSelect: () => organizeDialog.open({ kind: 'agent-management' }),
        },
        {
          label: 'Tag Management',
          disabled: !global.can('tag.manage'),
          onSelect: () => organizeDialog.open({ kind: 'tag-management' }),
        },
        { type: 'separator' },
        { label: 'Refresh', shortcut: 'F5', onSelect: () => queryClient.invalidateQueries() },
        { type: 'separator' },
        { label: 'Sign Out', onSelect: () => navigate({ to: '/logout' }) },
      ],
    },
    {
      label: 'Action',
      items: [
        {
          label: 'Move VM to Folder',
          disabled:
            selection?.kind !== 'vm' ||
            !canMoveVm ||
            (vmFolders.ready && vmFolders.targets.length === 0),
          onSelect: () =>
            selection?.kind === 'vm' &&
            organizeDialog.open({ kind: 'move-vm', vmId: selection.id }),
        },
        {
          label: 'Move Host',
          disabled: selection?.kind !== 'host' || !global.can('host.manage'),
          onSelect: () =>
            selection?.kind === 'host' &&
            organizeDialog.open({ kind: 'move-host', hostId: selection.id }),
        },
        {
          label: 'Delete Folder',
          disabled: selection?.kind !== 'folder' || !canDeleteFolder,
          onSelect: () =>
            selection?.kind === 'folder' &&
            organizeDialog.open({ kind: 'delete-folder', folderId: selection.id }),
        },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Refresh', onSelect: () => queryClient.invalidateQueries() },
        { type: 'separator' },
        {
          label: 'Events History',
          disabled: !global.can('audit.read'),
          onSelect: () => setEventsOpen(true),
        },
        {
          label: 'VM Locks',
          disabled: !global.can('task.cancel'),
          onSelect: () => setLocksOpen(true),
        },
      ],
    },
    {
      label: 'Administration',
      items: [
        {
          label: 'Roles',
          disabled: !global.can('rbac.manage'),
          onSelect: () => organizeDialog.open({ kind: 'roles' }),
        },
        {
          label: 'Global Permissions',
          disabled: !global.can('rbac.manage'),
          onSelect: () => organizeDialog.open({ kind: 'global-permissions' }),
        },
      ],
    },
    {
      label: 'Preferences',
      items: [
        {
          label: 'Theme',
          items: THEMES.map((t) => ({
            label: t.label,
            checked: t.id === theme,
            onSelect: () => setTheme(t.id),
          })),
        },
        {
          label: 'Tree Behavior',
          items: TREE_BEHAVIORS.map((b) => ({
            label: b.label,
            checked: b.id === treeBehavior,
            onSelect: () => setTreeBehavior(b.id),
          })),
        },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'About Open vCenter', onSelect: () => setAboutOpen(true) },
        ...(import.meta.env.DEV
          ? ([
              { type: 'separator' },
              { label: 'Auth Debug', onSelect: () => setAuthDebugOpen(true) },
            ] as MenuEntry[])
          : []),
      ],
    },
  ]

  return (
    <>
      <MenuBar menus={menus} />
      {eventsOpen ? (
        <EventsHistoryDialog onClose={() => setEventsOpen(false)} />
      ) : null}
      {locksOpen ? <VmLocksDialog onClose={() => setLocksOpen(false)} /> : null}
      {aboutOpen ? <AboutDialog onClose={() => setAboutOpen(false)} /> : null}
      {import.meta.env.DEV && authDebugOpen ? (
        <AuthDebugDialog auth={auth} onClose={() => setAuthDebugOpen(false)} />
      ) : null}
    </>
  )
}
