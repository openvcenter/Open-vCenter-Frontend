import { Button, GroupBox, Table, Td, Th } from '~/components/win95'
import type { Vm } from '~/api/types'
import { dateTime } from '../../format'
import { useVmManagementAction } from '../../actions/useVmManagementAction'
import { useVmActionBlock } from '../../actions/useVmActionBlock'
import { vmActionDialog } from '../vmActions/dialogStore'
import { confirm } from '../../confirm'

export function VmSnapshotsPanel({ vm }: { vm: Vm }) {
  const mgmt = useVmManagementAction(vm)
  // same gate as the header: a locked VM, an offline host or a VM mid-transition
  // would only come back as a 409
  const block = useVmActionBlock(vm)
  const disabled = block.blocked || mgmt.isPending

  const restore = async (id: string, name: string) => {
    if (
      await confirm({
        title: vm.name,
        message: `Restore snapshot "${name}"? The VM reverts to that point, and its current state is lost unless you take a snapshot first.`,
        confirmLabel: 'Restore',
        danger: true,
      })
    ) {
      mgmt.mutate({ kind: 'action', action: 'snapshot_restore', params: { snapshot_id: id } })
    }
  }

  const remove = async (id: string, name: string) => {
    if (
      await confirm({
        title: vm.name,
        message: `Delete snapshot "${name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      })
    ) {
      mgmt.mutate({ kind: 'action', action: 'snapshot_remove', params: { snapshot_id: id } })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        {block.reason ? (
          <p className="mr-auto text-notice-text">
            Snapshot actions are unavailable: {block.reason}.
          </p>
        ) : null}
        <Button
          className="min-w-0 px-2"
          disabled={disabled}
          onClick={() => vmActionDialog.open({ kind: 'snapshot-create', vmId: vm.id })}
        >
          Create snapshot…
        </Button>
      </div>
      <GroupBox label="Snapshots">
        {vm.snapshots.length === 0 ? (
          <p className="text-base">
            No snapshots. Take one before a risky change such as patching or
            an upgrade: Restore returns the VM to that point.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Created</Th>
                <Th className="w-0">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {vm.snapshots.map((s) => (
                <tr key={s.id}>
                  <Td>{s.name || s.id}</Td>
                  <Td>{dateTime(s.createdAt)}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <Button
                        className="min-w-0 px-2"
                        disabled={disabled}
                        onClick={() => restore(s.id, s.name || s.id)}
                      >
                        Restore
                      </Button>
                      <Button
                        className="min-w-0 px-2"
                        disabled={disabled}
                        onClick={() => remove(s.id, s.name || s.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </GroupBox>
    </div>
  )
}
