import { useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  Copy,
  Disc,
  FileUp,
  FolderInput,
  HardDrive,
  Lock,
  MoreHorizontal,
  Move,
  Pencil,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  TextCursorInput,
  Trash2,
} from "lucide-react";
import { Button, Icon, Menu } from "~/components/win95";
import type { MenuItemDef } from "~/components/win95";
import { qk } from "~/api/queryKeys";
import { releaseVmLock, removeVmFromInventory } from "~/api/endpoints/vms";
import { ApiError } from "~/api/client";
import { objKey, usePrivileges, useVmActionPrivileges } from "../rbac/privileges";
import type { VmManagementAction, Vm } from "~/api/types";
import { VmPowerButtons } from "./VmPowerButtons";
import { moveStorageTargets } from "./vmActions/storage";
import { organizeDialog } from "../organize/dialogStore";
import { useVmFolderTargets } from "../organize/scope";
import { vmActionDialog } from "./vmActions/dialogStore";
import { useVmManagementAction } from "../actions/useVmManagementAction";
import { useVmActionBlock } from "../actions/useVmActionBlock";
import { statusMessage } from "../actions/statusMessage";
import { taskLabel } from "../tasks/taskLabels";
import { relTime } from "../format";
import { confirm } from "../confirm";
import { useInventorySelection } from "../selection";

export function VmActionsBar({ vm }: { vm: Vm }) {
  const queryClient = useQueryClient();
  const mgmt = useVmManagementAction(vm);
  const privs = usePrivileges(objKey("vm", vm.id));
  const hostPrivs = usePrivileges(objKey("host", vm.hostId));
  const actionPriv = useVmActionPrivileges();
  // greyed out unless the caller holds the privilege the VM action needs
  const can = (action: string) => privs.can(actionPriv[action]);
  const gate = (allowed: boolean, item: MenuItemDef): MenuItemDef =>
    allowed || "type" in item ? item : { ...item, disabled: true };
  const { select } = useInventorySelection();
  const off = vm.state === "Off";
  // Host agent stopped checking in - the VM reads as Unknown and no agent-backed
  // action can run. Only "Remove from Inventory" (a DB-only delete) stays open.
  const { host, locked, hostOffline } = useVmActionBlock(vm);

  // HA is a cluster-only concept - hide it entirely on a standalone host
  const inCluster = !!host.data?.clusterId;
  const dvdMounted = !!vm.dvdPath;
  const moveTargets = moveStorageTargets(host.data, vm);
  const folderTargets = useVmFolderTargets(vm.id);

  const forceUnlock = async () => {
    if (
      !(await confirm({
        title: vm.name,
        message:
          "Force-release the lock on this VM? Only do this if the operation is genuinely stuck - releasing it while the agent is still working can corrupt the VM.",
        confirmLabel: "Force unlock",
        danger: true,
      }))
    ) {
      return;
    }
    try {
      await releaseVmLock(vm.id);
      statusMessage.set(`Lock released for ${vm.name}`);
    } catch (e) {
      statusMessage.set(
        `${vm.name}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    queryClient.invalidateQueries({ queryKey: ["vms"] });
    queryClient.invalidateQueries({ queryKey: qk.vm(vm.id) });
  };

  const removeFromInventory = async () => {
    if (
      !(await confirm({
        title: vm.name,
        message:
          "Remove this VM from the inventory? This only deletes the record from " +
          "Open vCenter - nothing is sent to the host. If the host " +
          "comes back online and still has the VM, it will reappear.",
        confirmLabel: "Remove",
        danger: true,
      }))
    ) {
      return;
    }
    try {
      await removeVmFromInventory(vm.id);
      statusMessage.set(`Removed ${vm.name} from inventory`);
      select({ kind: "host", id: vm.hostId });
    } catch (e) {
      statusMessage.set(
        `${vm.name}: ${e instanceof ApiError ? e.message : String(e)}`,
      );
    }
    queryClient.invalidateQueries({ queryKey: ["vms"] });
    queryClient.invalidateQueries({ queryKey: qk.hostVms(vm.hostId) });
    queryClient.invalidateQueries({ queryKey: qk.host(vm.hostId) });
  };

  // Force the host agent to re-inventory just this VM (read-only, no VM lock),
  // then let <TaskWatcher> refresh the views when the task lands. Falls back to a
  // plain cache invalidation when the host agent is offline.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.vm(vm.id) });
    queryClient.invalidateQueries({ queryKey: ["vms"] });
    if (hostOffline) {
      statusMessage.set(`Refreshed ${vm.name}`);
      return;
    }
    mgmt.mutate({ kind: "action", action: "refresh" });
  };

  const confirmAction = async (action: VmManagementAction, message: string) => {
    if (await confirm({ title: vm.name, message, confirmLabel: "Yes" })) {
      mgmt.mutate({ kind: "action", action });
    }
  };

  const items: MenuItemDef[] = [
    gate(can("edit"), {
      label: "Edit VM",
      icon: Pencil,
      onSelect: () => vmActionDialog.open({ kind: "edit", vmId: vm.id }),
    }),
    gate(can("rename"), {
      label: "Rename VM",
      icon: TextCursorInput,
      disabled: !off,
      onSelect: () => vmActionDialog.open({ kind: "rename", vmId: vm.id }),
    }),
    gate(can("notes_edit"), {
      label: "Edit Notes",
      icon: Pencil,
      onSelect: () => vmActionDialog.open({ kind: "notes", vmId: vm.id }),
    }),
    gate(privs.can("vm.config"), {
      label: "Move to Folder",
      icon: FolderInput,
      // no folder exists in the VM's cluster/host scope
      disabled: folderTargets.ready && folderTargets.targets.length === 0,
      onSelect: () => organizeDialog.open({ kind: "move-vm", vmId: vm.id }),
    }),
    gate(can("move_storage"), {
      label: "Move Storage",
      icon: HardDrive,
      // nowhere to move if the host reports only the volume the VM is on
      disabled: host.isSuccess && moveTargets.length === 0,
      onSelect: () =>
        vmActionDialog.open({ kind: "move-storage", vmId: vm.id }),
    }),
    gate(can("startup_change"), {
      label: "Edit AutoStart",
      icon: AlarmClock,
      onSelect: () => vmActionDialog.open({ kind: "autostart", vmId: vm.id }),
    }),
    { type: "separator" },
    dvdMounted
      ? gate(can("eject_dvd"), {
          label: "Eject DVD",
          icon: Disc,
          onSelect: () =>
            confirmAction("eject_dvd", `Eject the DVD from "${vm.name}"?`),
        })
      : gate(can("mount_dvd"), {
          label: "Mount DVD",
          icon: Disc,
          onSelect: () =>
            vmActionDialog.open({ kind: "mount-dvd", vmId: vm.id }),
        }),
    { type: "separator" },
    // migration and HA only make sense on a clustered host
    ...(inCluster
      ? ([
          {
            // only cluster roles (HA VMs) can move between nodes - Move-VM
            // outside the cluster needs a live-migration setup we don't manage
            label: vm.highlyAvailable
              ? "Migrate VM"
              : "Migrate VM (requires HA)",
            icon: Move,
            disabled: !vm.highlyAvailable || !can("migrate"),
            onSelect: () =>
              vmActionDialog.open({ kind: "migrate", vmId: vm.id }),
          },
          vm.highlyAvailable
            ? gate(can("disable_ha"), {
                label: "Disable HA",
                icon: ShieldX,
                onSelect: () =>
                  confirmAction(
                    "disable_ha",
                    `Disable High Availability for "${vm.name}"?`,
                  ),
              })
            : gate(can("enable_ha"), {
                label: "Enable HA",
                icon: ShieldCheck,
                onSelect: () =>
                  confirmAction(
                    "enable_ha",
                    `Enable High Availability for "${vm.name}"?`,
                  ),
              }),
          { type: "separator" },
        ] as MenuItemDef[])
      : []),
    // cloning and exporting read the VM's disks, so the VM must be off
    {
      label: "Clone VM",
      icon: Copy,
      disabled: !off || !hostPrivs.can("vm.create"),
      onSelect: () =>
        organizeDialog.open({
          kind: "new-vm",
          mode: "clone",
          sourceVmId: vm.id,
          hostId: vm.hostId,
        }),
    },
    {
      label: "Export as Template",
      icon: FileUp,
      disabled: !off || !can("export_template") || !hostPrivs.can("vm.create"),
      onSelect: () =>
        vmActionDialog.open({ kind: "export-template", vmId: vm.id }),
    },
  ];

  // while an operation is running on the VM - or the host agent is offline -
  // every agent-backed action is off-limits. Exceptions: force-unlock for a
  // stuck lock (`task.cancel`), and "Remove from Inventory" for a VM stranded on
  // a dead host (`vm.delete`).
  let menuItems: MenuItemDef[] =
    locked || hostOffline
      ? items.map((it) => ("type" in it ? it : { ...it, disabled: true }))
      : items;
  if (hostOffline) {
    menuItems = [
      ...menuItems,
      { type: "separator" },
      {
        label: "Remove from Inventory",
        icon: Trash2,
        danger: true,
        disabled: !privs.can("vm.delete"),
        onSelect: removeFromInventory,
      },
    ];
  }
  if (locked && privs.can("task.cancel")) {
    menuItems = [
      ...menuItems,
      { type: "separator" },
      {
        label: "Force unlock",
        icon: Lock,
        danger: true,
        onSelect: forceUnlock,
      },
    ];
  }

  return (
    <div className="flex items-center gap-1">
      <VmPowerButtons vm={vm} />
      <Button
        className="min-w-0 px-2"
        onClick={refresh}
        title="Refresh details"
      >
        <Icon icon={RefreshCw} size={14} />
        Refresh
      </Button>
      <Menu
        label={
          <span className="flex items-center gap-1">
            <Icon icon={MoreHorizontal} size={14} />
            More
          </span>
        }
        items={menuItems}
      />
      {vm.lock ? (
        <span
          className="bevel-thin-sunken bg-window ml-1 flex items-center gap-1 px-1.5 py-[2px] text-notice-text"
          title={`${taskLabel(vm.lock.kind)} - started by ${vm.lock.requestedBy} ${relTime(
            vm.lock.acquiredAt,
          )}`}
        >
          <Icon icon={Lock} size={12} />
          {taskLabel(vm.lock.kind)}…
        </span>
      ) : null}
    </div>
  );
}
