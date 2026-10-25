import { Disc, DiscAlbum } from 'lucide-react'
import { ToolbarButton, ToolbarSeparator } from '~/components/win95'
import type { Vm, VmPowerAction } from '~/api/types'
import { TRANSITIONAL_VM_STATES } from '~/api/types'
import { POWER_ACTIONS } from '../../actions/powerActions'
import { useVmPowerAction } from '../../actions/useVmPowerAction'
import { useVmManagementAction } from '../../actions/useVmManagementAction'
import { confirm } from '../../confirm'
import { vmActionDialog } from '../vmActions/dialogStore'

// the console toolbar's subset of the header power buttons, same order
const CONSOLE_POWER: VmPowerAction[] = ['start', 'shutdown', 'stop', 'restart']

/**
 * VM power + DVD controls shown at the head of the console toolbar (both the
 * embedded Console tab and the standalone new-tab console). The operator can
 * start / shut down / turn off / restart the VM and mount or eject its DVD
 * without leaving the console.
 *
 * Requires <ConfirmHost/> and <VmActionDialogs/> mounted in the tree (the
 * Explorer and the /console route both mount them).
 */
export function ConsoleVmActions({ vm }: { vm: Vm }) {
  const power = useVmPowerAction(vm)
  const mgmt = useVmManagementAction(vm)

  const busy =
    power.isPending ||
    mgmt.isPending ||
    TRANSITIONAL_VM_STATES.has(vm.state) ||
    !!vm.lock
  const ask = async (message: string, confirmLabel: string, danger = false) =>
    confirm({ title: vm.name, message, confirmLabel, danger })

  // label, icon, allowed states and confirmation come from the shared power
  // matrix (powerActions.ts), so the console never disagrees with the header
  return (
    <>
      {CONSOLE_POWER.map((id) => {
        const def = POWER_ACTIONS.find((a) => a.id === id)!
        return (
          <ToolbarButton
            key={id}
            icon={def.icon}
            label={def.label}
            onClick={async () => {
              if (
                def.confirm &&
                !(await ask(def.confirm, def.label, def.destructive))
              ) {
                return
              }
              power.mutate({ action: id })
            }}
            disabled={busy || !def.allowedStates.includes(vm.state)}
          />
        )
      })}
      <ToolbarSeparator />
      {vm.dvdPath ? (
        <ToolbarButton
          icon={DiscAlbum}
          label="Eject DVD"
          showLabel
          onClick={async () => {
            if (await ask(`Eject the DVD from "${vm.name}"?`, 'Eject')) {
              mgmt.mutate({ kind: 'action', action: 'eject_dvd' })
            }
          }}
          disabled={busy}
        />
      ) : (
        <ToolbarButton
          icon={Disc}
          label="Mount DVD"
          showLabel
          onClick={() => vmActionDialog.open({ kind: 'mount-dvd', vmId: vm.id })}
          disabled={busy}
        />
      )}
    </>
  )
}
