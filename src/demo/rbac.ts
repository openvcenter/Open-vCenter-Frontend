import type {
  EffectiveLevel,
  EffectivePermissions,
  Permission,
  PermissionList,
  PermissionScopeType,
  PrivilegeInfo,
  RbacCatalog,
  Role,
} from "~/api/types";
import type { DemoPermission, DemoRole, DemoState } from "./model";
import type { Rng } from "./random";
import { uuid } from "./random";

/**
 * The simulated access control - mirrors ovc-backend `services/privileges.py`
 * and `services/rbac.py`: privileges → roles → permissions granted to groups on
 * global / cluster / host / folder / VM. The demo user is in the ADMINISTRATOR
 * group (a superuser), so this only feeds the Roles dialog, the Permissions
 * tabs and Effective Permissions.
 */

export const PRIVILEGES: PrivilegeInfo[] = [
  { id: "vm.power", group: "Virtual machine", label: "Power on / off, restart, pause" },
  { id: "vm.console", group: "Virtual machine", label: "Open console" },
  { id: "vm.config", group: "Virtual machine", label: "Edit settings, rename, tags, move to folder" },
  { id: "vm.snapshot", group: "Virtual machine", label: "Create, restore and remove checkpoints" },
  { id: "vm.delete", group: "Virtual machine", label: "Delete or remove from inventory" },
  { id: "vm.migrate", group: "Virtual machine", label: "Migrate between hosts or storage" },
  { id: "vm.media", group: "Virtual machine", label: "Mount and eject DVD / ISO" },
  { id: "vm.create", group: "Host", label: "Create VMs (new, clone, deploy) and receive moved ones" },
  { id: "host.maintenance", group: "Host", label: "Suspend, drain, resume, restart" },
  { id: "host.config", group: "Host", label: "Edit host settings and VLANs" },
  { id: "host.manage", group: "Host", label: "Add, remove and move hosts, manage agents" },
  { id: "host.console", group: "Host", label: "Open the host remote console" },
  { id: "cluster.manage", group: "Cluster", label: "Create, edit and delete clusters" },
  { id: "folder.manage", group: "Inventory", label: "Create, rename and delete folders" },
  { id: "tag.manage", group: "Inventory", label: "Manage the tag catalog" },
  { id: "task.cancel", group: "Operations", label: "Release VM locks" },
  { id: "audit.read", group: "Operations", label: "Read the audit log" },
  { id: "settings.manage", group: "Operations", label: "Manage global settings" },
  { id: "rbac.manage", group: "Security", label: "Manage roles and permissions" },
];
export const ALL_PRIVILEGES = PRIVILEGES.map((p) => p.id);

const VM_ACTIONS: Record<string, string | null> = {
  start: "vm.power",
  stop: "vm.power",
  shutdown: "vm.power",
  restart: "vm.power",
  pause: "vm.power",
  delete: "vm.delete",
  rename: "vm.config",
  edit: "vm.config",
  migrate: "vm.migrate",
  move_storage: "vm.migrate",
  startup_change: "vm.config",
  mount_dvd: "vm.media",
  eject_dvd: "vm.media",
  enable_ha: "vm.config",
  disable_ha: "vm.config",
  export_template: "vm.config",
  notes_edit: "vm.config",
  snapshot_create: "vm.snapshot",
  snapshot_remove: "vm.snapshot",
  snapshot_restore: "vm.snapshot",
  refresh: null,
};

export const catalog = (): RbacCatalog => ({ privileges: PRIVILEGES, vmActions: VM_ACTIONS });

export const ADMINISTRATOR_ROLE_ID = "00000000-0000-4000-8000-000000000001";
export const READ_ONLY_ROLE_ID = "00000000-0000-4000-8000-000000000002";
export const NO_ACCESS_ROLE_ID = "00000000-0000-4000-8000-000000000003";
const VM_POWER_USER_ROLE_ID = "00000000-0000-4000-8000-000000000101";
const VM_CONSOLE_USER_ROLE_ID = "00000000-0000-4000-8000-000000000102";
const VM_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000103";
const HOST_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000104";
const AUDITOR_ROLE_ID = "00000000-0000-4000-8000-000000000105";

/** The roles ovc-backend's migration 0006 seeds. */
export function seedRoles(): DemoRole[] {
  return [
    { id: ADMINISTRATOR_ROLE_ID, name: "Administrator", description: "Every privilege, including ones added later", builtin: true, privileges: [] },
    { id: READ_ONLY_ROLE_ID, name: "Read-only", description: "See the object and everything below it; change nothing", builtin: true, privileges: [] },
    { id: NO_ACCESS_ROLE_ID, name: "No access", description: "Hide the object and what is below it", builtin: true, privileges: [] },
    { id: VM_POWER_USER_ROLE_ID, name: "VM Power User", description: "Operate VMs: power, console, checkpoints, media", builtin: false, privileges: ["vm.power", "vm.console", "vm.snapshot", "vm.media"] },
    { id: VM_CONSOLE_USER_ROLE_ID, name: "VM Console User", description: "Open VM consoles, change nothing", builtin: false, privileges: ["vm.console"] },
    { id: VM_ADMIN_ROLE_ID, name: "VM Administrator", description: "Full control of VMs and folders", builtin: false, privileges: ["vm.power", "vm.console", "vm.config", "vm.snapshot", "vm.create", "vm.delete", "vm.migrate", "vm.media", "folder.manage"] },
    { id: HOST_ADMIN_ROLE_ID, name: "Host Administrator", description: "Maintain and configure hosts, migrate their VMs", builtin: false, privileges: ["host.maintenance", "host.config", "host.manage", "host.console", "vm.migrate"] },
    { id: AUDITOR_ROLE_ID, name: "Auditor", description: "Read the audit log", builtin: false, privileges: ["audit.read"] },
  ];
}

/** A few example grants so the Permissions tabs have something to show. */
export function seedPermissions(rng: Rng, state: DemoState, now: number): DemoPermission[] {
  const at = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();
  const perm = (
    group: string,
    roleId: string,
    scopeType: PermissionScopeType,
    scopeId: string | null,
    daysAgo: number,
    propagate = true,
  ): DemoPermission => ({
    id: uuid(),
    group,
    roleId,
    scopeType,
    scopeId,
    propagate,
    createdBy: "admin@ovc.demo",
    createdAt: at(daysAgo),
  });
  const out: DemoPermission[] = [perm("auditors", AUDITOR_ROLE_ID, "global", null, 30)];
  const cluster = state.clusters[0];
  if (cluster) {
    out.push(perm("infra-team", HOST_ADMIN_ROLE_ID, "cluster", cluster.id, 25));
    out.push(perm("helpdesk", VM_CONSOLE_USER_ROLE_ID, "cluster", cluster.id, 20));
  }
  const folder = state.folders.length ? rng.pick(state.folders) : undefined;
  if (folder) {
    out.push(perm("db-team", VM_POWER_USER_ROLE_ID, "folder", folder.id, 12));
    const vm = state.vms.find((v) => v.folderId === folder.id);
    if (vm) out.push(perm("db-team", NO_ACCESS_ROLE_ID, "vm", vm.id, 5, false));
  }
  return out;
}

export function rolePrivileges(role: DemoRole | undefined): string[] {
  if (!role) return [];
  return role.id === ADMINISTRATOR_ROLE_ID ? ALL_PRIVILEGES : role.privileges;
}

export function roleOut(state: DemoState, role: DemoRole): Role {
  const privs = new Set(rolePrivileges(role));
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    builtin: role.builtin,
    privileges: ALL_PRIVILEGES.filter((p) => privs.has(p)),
    permissionCount: state.permissions.filter((p) => p.roleId === role.id).length,
  };
}

// ---- objects and their ancestors --------------------------------------------------

type Ref = { type: PermissionScopeType; id: string | null };
const GLOBAL: Ref = { type: "global", id: null };
const key = (r: Ref) => `${r.type}:${r.id ?? ""}`;

export function scopeName(state: DemoState, r: Ref): string | null {
  switch (r.type) {
    case "global":
      return "Global";
    case "cluster":
      return state.clusters.find((c) => c.id === r.id)?.name ?? null;
    case "host":
      return state.hosts.find((h) => h.id === r.id)?.name ?? null;
    case "folder":
      return state.folders.find((f) => f.id === r.id)?.name ?? null;
    case "vm":
      return state.vms.find((v) => v.id === r.id)?.name ?? null;
  }
}

export function scopeExists(state: DemoState, r: Ref): boolean {
  return r.type === "global" || scopeName(state, r) !== null;
}

/** `r` and the objects above it, most specific first (not for VMs). */
function chain(state: DemoState, r: Ref): Ref[] {
  if (r.type === "global") return [GLOBAL];
  if (r.type === "cluster") return [r, GLOBAL];
  if (r.type === "host") {
    const clusterId = state.hosts.find((h) => h.id === r.id)?.clusterId;
    return [r, ...(clusterId ? chain(state, { type: "cluster", id: clusterId }) : [GLOBAL])];
  }
  const folder = state.folders.find((f) => f.id === r.id);
  if (folder?.clusterId) return [r, ...chain(state, { type: "cluster", id: folder.clusterId })];
  if (folder?.hostId) return [r, ...chain(state, { type: "host", id: folder.hostId })];
  return [r, GLOBAL];
}

/** A VM's inheritance paths: its folder (if any) and its host. */
function vmPaths(state: DemoState, vmId: string): { name: string; refs: Ref[] }[] {
  const vm = state.vms.find((v) => v.id === vmId);
  const paths: { name: string; refs: Ref[] }[] = [];
  if (vm?.folderId) paths.push({ name: "folder", refs: chain(state, { type: "folder", id: vm.folderId }) });
  paths.push({ name: "host", refs: vm ? chain(state, { type: "host", id: vm.hostId }) : [GLOBAL] });
  return paths;
}

export function permissionOut(state: DemoState, p: DemoPermission): Permission {
  return {
    id: p.id,
    group: p.group,
    roleId: p.roleId,
    roleName: state.roles.find((r) => r.id === p.roleId)?.name ?? "",
    scopeType: p.scopeType,
    scopeId: p.scopeId,
    scopeName: scopeName(state, { type: p.scopeType, id: p.scopeId }),
    propagate: p.propagate,
    createdBy: p.createdBy,
    createdAt: p.createdAt,
  };
}

const on = (state: DemoState, r: Ref) =>
  state.permissions.filter((p) => p.scopeType === r.type && p.scopeId === r.id);

export function permissionList(state: DemoState, r: Ref): PermissionList {
  const above: Ref[] = [];
  if (r.type === "vm") {
    for (const path of vmPaths(state, r.id!))
      for (const a of path.refs) if (!above.some((x) => key(x) === key(a))) above.push(a);
  } else {
    above.push(...chain(state, r).slice(1));
  }
  const byGroup = (a: DemoPermission, b: DemoPermission) => a.group.localeCompare(b.group);
  return {
    direct: on(state, r).sort(byGroup).map((p) => permissionOut(state, p)),
    inherited: above.flatMap((a) =>
      on(state, a)
        .filter((p) => p.propagate)
        .sort(byGroup)
        .map((p) => permissionOut(state, p)),
    ),
  };
}

// ---- resolution (one group) -----------------------------------------------------

type LevelResult = Set<string> | "blocked" | null;

function level(state: DemoState, group: string, r: Ref, direct: boolean) {
  const rows = on(state, r).filter((p) => p.group === group && (direct || p.propagate));
  let result: LevelResult = null;
  if (rows.length) {
    result = rows.some((p) => p.roleId === NO_ACCESS_ROLE_ID)
      ? "blocked"
      : new Set(rows.flatMap((p) => rolePrivileges(state.roles.find((x) => x.id === p.roleId))));
  }
  return { rows, result };
}

function explainPath(state: DemoState, group: string, refs: Ref[], firstDirect: boolean) {
  const levels = refs.map((r, i) => ({ r, ...level(state, group, r, firstDirect && i === 0) }));
  const winner = levels.find((l) => l.result !== null);
  const out: EffectiveLevel[] = levels.map((l) => ({
    scopeType: l.r.type,
    scopeId: l.r.id,
    scopeName: scopeName(state, l.r),
    blocked: l.result === "blocked",
    winner: l === winner,
    permissions: l.rows.map((p) => permissionOut(state, p)),
  }));
  return { levels: out, result: winner?.result ?? null };
}

export function effective(state: DemoState, group: string, r: Ref): EffectivePermissions {
  if (group === "ADMINISTRATOR") {
    return { group, superuser: true, visible: true, privileges: ALL_PRIVILEGES, paths: [] };
  }
  const paths: EffectivePermissions["paths"] = [];
  let result: Set<string> | null = null;
  if (r.type === "vm") {
    const own = explainPath(state, group, [r], true);
    paths.push({ name: "vm", levels: own.levels });
    const inherited = vmPaths(state, r.id!).map((p) => ({
      name: p.name,
      ...explainPath(state, group, p.refs, false),
    }));
    paths.push(...inherited.map((p) => ({ name: p.name, levels: p.levels })));
    if (own.result !== null) {
      result = own.result === "blocked" ? null : own.result;
    } else {
      const sets = inherited.map((p) => p.result).filter((x): x is Set<string> => x instanceof Set);
      result = sets.length ? new Set(sets.flatMap((x) => [...x])) : null;
    }
  } else {
    const p = explainPath(state, group, chain(state, r), true);
    paths.push({ name: "object", levels: p.levels });
    result = p.result instanceof Set ? p.result : null;
  }
  return {
    group,
    superuser: false,
    visible: result !== null,
    privileges: ALL_PRIVILEGES.filter((p) => result?.has(p)),
    paths,
  };
}

/** Drop permissions on objects that no longer exist (the backend's cascade). */
export function pruneOrphanPermissions(state: DemoState) {
  state.permissions = state.permissions.filter((p) =>
    scopeExists(state, { type: p.scopeType, id: p.scopeId }),
  );
}
