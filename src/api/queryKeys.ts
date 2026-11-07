import type { AuditEventParams } from './endpoints/audit'
import type { VmListParams } from './endpoints/vms'

/** Central query-key factory so invalidation stays consistent. */
export const qk = {
  clusters: () => ['clusters'] as const,
  cluster: (id: string) => ['clusters', id] as const,

  hosts: (clusterId?: string) => ['hosts', { clusterId: clusterId ?? null }] as const,
  host: (id: string) => ['hosts', id] as const,
  hostVms: (id: string) => ['hosts', id, 'vms'] as const,
  hostMetrics: (id: string, seconds: number) => ['hosts', id, 'metrics', seconds] as const,
  hostTemplates: (id: string) => ['hosts', id, 'templates'] as const,
  hostIsos: (id: string) => ['hosts', id, 'isos'] as const,
  hostAgentConfig: (id: string) => ['hosts', id, 'agent-config'] as const,
  hostAgentInstall: (id: string) => ['hosts', id, 'agent-install'] as const,

  folders: (params: { hostId?: string; clusterId?: string }) =>
    ['folders', params] as const,

  vlans: (params: { hostId?: string; clusterId?: string } = {}) =>
    ['vlans', params] as const,

  tags: () => ['tags'] as const,
  tagCategories: () => ['tag-categories'] as const,

  vms: (params: VmListParams = {}) => ['vms', params] as const,
  vm: (id: string) => ['vms', id] as const,
  vmMetrics: (id: string, seconds: number) => ['vms', id, 'metrics', seconds] as const,
  vmThumbnail: (id: string, lastSeen: string | null) =>
    ['vms', id, 'thumbnail', lastSeen] as const,
  vmLocks: () => ['vms', 'locks'] as const,

  tasks: (params: { vmId?: string; hostId?: string } = {}) =>
    ['tasks', params] as const,
  task: (id: string) => ['tasks', id] as const,

  auditEvents: (params: AuditEventParams = {}) => ['audit-events', params] as const,
  auditEventsAll: () => ['audit-events'] as const,

  templates: () => ['templates'] as const,
  isos: () => ['isos'] as const,

  me: () => ['me'] as const,
  rbacCatalog: () => ['rbac', 'catalog'] as const,
  roles: () => ['rbac', 'roles'] as const,
  permissions: (scopeType: string, scopeId: string | null) =>
    ['rbac', 'permissions', scopeType, scopeId] as const,
  groups: (q: string) => ['rbac', 'groups', q] as const,
  effective: (group: string, object: string) =>
    ['rbac', 'effective', group, object] as const,
  /** One object's privileges; under `me` so RBAC changes refresh them. */
  myPrivileges: (objKey: string) => ['me', 'privileges', objKey] as const,
  vmConsole: (id: string) => ['vms', id, 'console'] as const,
  hostConsole: (id: string) => ['hosts', id, 'console'] as const,

  settings: () => ['settings'] as const,

  agentBinaries: () => ['agent-binaries'] as const,
  agentStorage: () => ['agent-binaries', 'storage'] as const,
}
