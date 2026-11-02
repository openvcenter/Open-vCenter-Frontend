import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getCluster, getClusters } from "./endpoints/clusters";
import {
  getHost,
  getHostAgentConfig,
  getHostAgentInstall,
  getHostIsos,
  getHostMetrics,
  getHostTemplates,
  getHostVms,
  getHosts,
} from "./endpoints/hosts";
import { getAgentBinaries, getAgentStorage } from "./endpoints/agentBinaries";
import { getAuditEvents } from "./endpoints/audit";
import type { AuditEventParams } from "./endpoints/audit";
import { getFolders } from "./endpoints/folders";
import { getVlans } from "./endpoints/vlans";
import { getTagCategories, getTags } from "./endpoints/tags";
import type { VlanListParams } from "./endpoints/vlans";
import {
  getVm,
  getVmLocks,
  getVmMetrics,
  getVmThumbnail,
  getVms,
} from "./endpoints/vms";
import type { VmListParams } from "./endpoints/vms";
import { getTask, getTasks } from "./endpoints/tasks";
import { getIsos, getTemplates } from "./endpoints/inventory";
import {
  getEffectivePermissions,
  getHostConsole,
  getMe,
  getPermissions,
  getGroups,
  getRbacCatalog,
  getRoles,
  getVmConsole,
} from "./endpoints/rbac";
import type { PermissionScope } from "./endpoints/rbac";
import { qk } from "./queryKeys";
import { TERMINAL_TASK_STATUSES } from "./types";

// Polling cadence mirrors the agent's periodic inventory posts (see api-contract.md).
const INTERVAL = {
  clusters: 30_000,
  hosts: 15_000,
  vms: 10_000,
  task: 1_500,
} as const;

export const clustersQuery = () =>
  queryOptions({
    queryKey: qk.clusters(),
    queryFn: ({ signal }) => getClusters(signal),
    refetchInterval: INTERVAL.clusters,
  });

export const clusterQuery = (id: string) =>
  queryOptions({
    queryKey: qk.cluster(id),
    queryFn: ({ signal }) => getCluster(id, signal),
    refetchInterval: INTERVAL.clusters,
  });

export const hostsQuery = (clusterId?: string) =>
  queryOptions({
    queryKey: qk.hosts(clusterId),
    queryFn: ({ signal }) => getHosts(clusterId, signal),
    refetchInterval: INTERVAL.hosts,
  });

export const hostQuery = (id: string) =>
  queryOptions({
    queryKey: qk.host(id),
    queryFn: ({ signal }) => getHost(id, signal),
    refetchInterval: INTERVAL.hosts,
  });

export const hostVmsQuery = (id: string) =>
  queryOptions({
    queryKey: qk.hostVms(id),
    queryFn: ({ signal }) => getHostVms(id, signal),
    refetchInterval: INTERVAL.vms,
  });

export const hostMetricsQuery = (id: string) =>
  queryOptions({
    queryKey: qk.hostMetrics(id),
    queryFn: ({ signal }) => getHostMetrics(id, signal),
    refetchInterval: INTERVAL.hosts,
  });

export const hostTemplatesQuery = (id: string) =>
  queryOptions({
    queryKey: qk.hostTemplates(id),
    queryFn: ({ signal }) => getHostTemplates(id, signal),
  });

export const hostIsosQuery = (id: string) =>
  queryOptions({
    queryKey: qk.hostIsos(id),
    queryFn: ({ signal }) => getHostIsos(id, signal),
  });

export const hostAgentConfigQuery = (id: string) =>
  queryOptions({
    queryKey: qk.hostAgentConfig(id),
    queryFn: ({ signal }) => getHostAgentConfig(id, signal),
    staleTime: 5 * 60_000,
  });

export const hostAgentInstallQuery = (id: string) =>
  queryOptions({
    queryKey: qk.hostAgentInstall(id),
    queryFn: ({ signal }) => getHostAgentInstall(id, signal),
    // the URL carries a short-lived token - don't cache it long
    staleTime: 30_000,
  });

export const foldersQuery = (params: { hostId?: string; clusterId?: string }) =>
  queryOptions({
    queryKey: qk.folders(params),
    queryFn: ({ signal }) => getFolders(params, signal),
    refetchInterval: INTERVAL.hosts,
  });

export const vlansQuery = (params: VlanListParams = {}) =>
  queryOptions({
    queryKey: qk.vlans(params),
    queryFn: ({ signal }) => getVlans(params, signal),
  });

export const tagCategoriesQuery = () =>
  queryOptions({
    queryKey: qk.tagCategories(),
    queryFn: ({ signal }) => getTagCategories(signal),
    refetchInterval: INTERVAL.clusters,
  });

export const tagsQuery = () =>
  queryOptions({
    queryKey: qk.tags(),
    queryFn: ({ signal }) => getTags(signal),
    refetchInterval: INTERVAL.clusters,
  });

export const vmsQuery = (params: VmListParams = {}) =>
  queryOptions({
    queryKey: qk.vms(params),
    queryFn: ({ signal }) => getVms(params, signal),
    refetchInterval: INTERVAL.vms,
  });

export const vmQuery = (id: string) =>
  queryOptions({
    queryKey: qk.vm(id),
    queryFn: ({ signal }) => getVm(id, signal),
    refetchInterval: INTERVAL.vms,
  });

export const vmMetricsQuery = (id: string) =>
  queryOptions({
    queryKey: qk.vmMetrics(id),
    queryFn: ({ signal }) => getVmMetrics(id, signal),
    refetchInterval: INTERVAL.vms,
  });

/** Last console thumbnail (`null` = none captured yet). No polling: the agent
 * only sends a new image with a vm_inventory, which bumps `vm.lastSeen` (already
 * polled by the VM query), so the key changes - and the image refetches - then. */
export const vmThumbnailQuery = (id: string, lastSeen: string | null) =>
  queryOptions({
    queryKey: qk.vmThumbnail(id, lastSeen),
    queryFn: () => getVmThumbnail(id),
    staleTime: Infinity,
    // keep showing this VM's previous image while the next one loads (never
    // another VM's - the panel stays mounted when the selection changes)
    placeholderData: (prev, prevQuery) =>
      prevQuery?.queryKey[1] === id ? prev : undefined,
  });

/** Active VM locks - admin only. Polls while the dialog is open. */
export const vmLocksQuery = () =>
  queryOptions({
    queryKey: qk.vmLocks(),
    queryFn: ({ signal }) => getVmLocks(signal),
    refetchInterval: INTERVAL.vms,
  });

export const taskQuery = (id: string) =>
  queryOptions({
    queryKey: qk.task(id),
    queryFn: ({ signal }) => getTask(id, signal),
    refetchInterval: (query) =>
      query.state.data && TERMINAL_TASK_STATUSES.has(query.state.data.status)
        ? false
        : INTERVAL.task,
  });

/** The audit log (admin only), newest first, one cursor page at a time. Used by
 *  View ▸ Events History and the Events tab of a cluster / host / VM - the only
 *  history screens (task details are reached from an event). Every mutation
 *  also invalidates `['audit-events']` (router.tsx), so a change shows up at
 *  once; the poll catches system events and task outcomes. */
export const auditEventsQuery = (params: AuditEventParams = {}) =>
  infiniteQueryOptions({
    queryKey: qk.auditEvents(params),
    queryFn: ({ signal, pageParam }) =>
      getAuditEvents({ limit: 50, ...params, cursor: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: 15_000,
  });

/** All recent tasks, for the bottom dock. Polls fast while any task is active. */
export const recentTasksQuery = () =>
  queryOptions({
    queryKey: qk.tasks({}),
    queryFn: ({ signal }) => getTasks({}, signal),
    refetchInterval: (query) => {
      const anyActive = (query.state.data ?? []).some(
        (t) => !TERMINAL_TASK_STATUSES.has(t.status),
      );
      return anyActive ? INTERVAL.task : 4_000;
    },
  });

export const templatesQuery = () =>
  queryOptions({
    queryKey: qk.templates(),
    queryFn: ({ signal }) => getTemplates(signal),
    refetchInterval: INTERVAL.hosts,
  });

export const isosQuery = () =>
  queryOptions({
    queryKey: qk.isos(),
    queryFn: ({ signal }) => getIsos(signal),
  });

export const agentBinariesQuery = () =>
  queryOptions({
    queryKey: qk.agentBinaries(),
    queryFn: ({ signal }) => getAgentBinaries(signal),
    refetchInterval: INTERVAL.clusters,
  });

export const agentStorageQuery = () =>
  queryOptions({
    queryKey: qk.agentStorage(),
    queryFn: ({ signal }) => getAgentStorage(signal),
  });

// ---- access control -------------------------------------------------------

export const meQuery = () =>
  queryOptions({
    queryKey: qk.me(),
    queryFn: ({ signal }) => getMe(signal),
    staleTime: 60_000,
  });

export const rbacCatalogQuery = () =>
  queryOptions({
    queryKey: qk.rbacCatalog(),
    queryFn: ({ signal }) => getRbacCatalog(signal),
    staleTime: Infinity,
  });

export const rolesQuery = () =>
  queryOptions({
    queryKey: qk.roles(),
    queryFn: ({ signal }) => getRoles(signal),
  });

export const permissionsQuery = (scope: PermissionScope) =>
  queryOptions({
    queryKey: qk.permissions(scope.scopeType, scope.scopeId),
    queryFn: ({ signal }) => getPermissions(scope, signal),
  });

export const groupsQuery = (q: string) =>
  queryOptions({
    queryKey: qk.groups(q),
    queryFn: ({ signal }) => getGroups(q, signal),
    staleTime: 30_000,
  });

export const effectiveQuery = (group: string, object: string) =>
  queryOptions({
    queryKey: qk.effective(group, object),
    queryFn: ({ signal }) => getEffectivePermissions(group, object, signal),
  });

/** Where the VM console connects - 403 without `vm.console`. */
export const vmConsoleQuery = (id: string) =>
  queryOptions({
    queryKey: qk.vmConsole(id),
    queryFn: ({ signal }) => getVmConsole(id, signal),
    staleTime: 60_000,
    retry: false,
  });

export const hostConsoleQuery = (id: string) =>
  queryOptions({
    queryKey: qk.hostConsole(id),
    queryFn: ({ signal }) => getHostConsole(id, signal),
    staleTime: 60_000,
    retry: false,
  });
