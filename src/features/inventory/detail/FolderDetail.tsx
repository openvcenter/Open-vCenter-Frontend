import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { Button, Icon, PropertyList } from '~/components/win95'
import {
  clustersQuery,
  foldersQuery,
  hostsQuery,
  vmsQuery,
} from '~/api/queries'
import { FolderIcon } from '../tree/nodeIcons'
import { organizeDialog } from '../organize/dialogStore'
import { DetailHeader } from './DetailHeader'
import { VmGrid } from './VmGrid'

export function FolderDetail({ folderId }: { folderId: string }) {
  const folders = useQuery(foldersQuery({}))
  const clusters = useQuery(clustersQuery())
  const hosts = useQuery(hostsQuery())
  // only this folder's VMs - the backend filters, so a big fleet isn't polled
  const vms = useQuery(vmsQuery({ folderId }))

  const folder = folders.data?.find((f) => f.id === folderId)
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
          <Button
            className="min-w-0 px-2"
            onClick={() =>
              organizeDialog.open({ kind: 'delete-folder', folderId })
            }
          >
            <Icon icon={Trash2} size={14} className="text-danger" />
            Delete Folder
          </Button>
        }
      />
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
  )
}
