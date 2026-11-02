import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { Button, Icon, PropertyList, Tabs } from '~/components/win95'
import type { TabItem } from '~/components/win95'
import {
  clustersQuery,
  foldersQuery,
  hostsQuery,
  vmsQuery,
} from '~/api/queries'
import { FolderIcon } from '../tree/nodeIcons'
import { organizeDialog } from '../organize/dialogStore'
import { useInventorySelection } from '../selection'
import { folderOwnerKey, objKey, useCan, usePrivileges } from '../rbac/privileges'
import { PERMISSIONS_TAB } from '../rbac/objectTabs'
import { PermissionsPanel } from '../rbac/PermissionsPanel'
import { DetailHeader } from './DetailHeader'
import { VmGrid } from './VmGrid'

const VMS_TAB: TabItem = { id: 'vms', label: 'Virtual Machines' }

export function FolderDetail({ folderId }: { folderId: string }) {
  const privs = usePrivileges(objKey('folder', folderId))
  const { tab, setTab } = useInventorySelection()
  const folders = useQuery(foldersQuery({}))
  const clusters = useQuery(clustersQuery())
  const hosts = useQuery(hostsQuery())
  // only this folder's VMs - the backend filters, so a big fleet isn't polled
  const vms = useQuery(vmsQuery({ folderId }))

  const folder = folders.data?.find((f) => f.id === folderId)
  // managed from its cluster / host, not from a permission on the folder itself
  const canManage = useCan('folder.manage', folder ? folderOwnerKey(folder) : null)
  // a cluster folder spans hosts, so the grid shows which host runs each VM
  const hostNames = React.useMemo(
    () =>
      folder?.clusterId
        ? new Map((hosts.data ?? []).map((h) => [h.id, h.name]))
        : undefined,
    [folder?.clusterId, hosts.data],
  )
  if (folders.data && !folder) {
    return <div className="p-3 text-disabled-text">Folder not found.</div>
  }

  const tabs = privs.can('rbac.manage') ? [VMS_TAB, PERMISSIONS_TAB] : [VMS_TAB]
  const active = tab && tabs.some((t) => t.id === tab) ? tab : 'vms'

  const scope = folder?.clusterId
    ? `Cluster: ${clusters.data?.find((c) => c.id === folder.clusterId)?.name ?? folder.clusterId}`
    : `Host: ${hosts.data?.find((h) => h.id === folder?.hostId)?.name ?? folder?.hostId ?? '…'}`

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <DetailHeader
        icon={<FolderIcon />}
        title={folder?.name ?? 'Loading folder…'}
        subtitle={scope}
        actions={
          <div className="flex gap-1">
            <Button
              className="min-w-0 px-2"
              disabled={!canManage}
              onClick={() =>
                organizeDialog.open({ kind: 'rename-folder', folderId })
              }
            >
              <Icon icon={Pencil} size={14} />
              Rename Folder
            </Button>
            <Button
              className="min-w-0 px-2"
              disabled={!canManage}
              onClick={() =>
                organizeDialog.open({ kind: 'delete-folder', folderId })
              }
            >
              <Icon icon={Trash2} size={14} className="text-danger" />
              Delete Folder
            </Button>
          </div>
        }
      />
      <Tabs tabs={tabs} value={active} onChange={setTab} className="min-h-0 flex-1">
        {active === 'vms' ? (
          <div className="flex h-full flex-col gap-3">
            <PropertyList
              items={[
                {
                  label: 'Virtual machines',
                  value: vms.data ? vms.data.length : '…',
                },
              ]}
            />
            <div className="min-h-0 flex-1">
              {vms.isError ? (
                <p className="text-danger">Could not load this folder's VMs.</p>
              ) : (
                <VmGrid vms={vms.data ?? []} hostNames={hostNames} />
              )}
            </div>
          </div>
        ) : null}
        {active === 'permissions' ? (
          <PermissionsPanel scopeType="folder" scopeId={folderId} />
        ) : null}
      </Tabs>
    </div>
  )
}
