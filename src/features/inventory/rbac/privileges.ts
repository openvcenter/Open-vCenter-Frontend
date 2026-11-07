import { useQueries, useQuery } from "@tanstack/react-query";
import { getMyPrivileges } from "~/api/endpoints/rbac";
import { foldersQuery, rbacCatalogQuery } from "~/api/queries";
import { qk } from "~/api/queryKeys";
import type { Folder, Privilege } from "~/api/types";
import { useAuth } from "~/auth/useAuth";

/**
 * The caller's privileges, for greying out what they can't do. The backend is
 * the authority (it answers 403 regardless); this only mirrors it.
 *
 * Every `usePrivileges` call is its own query (`qk.myPrivileges(objKey)`), but
 * the fetches are batched: the keys requested in one tick go out as a single
 * `GET /me/privileges?ids=…`. The ADMINISTRATOR role short-circuits to "all"
 * without a request.
 */

/** `global`, or `<kind>:<id>` for cluster / host / folder / vm. */
export type ObjKey = string;

export const GLOBAL_KEY: ObjKey = "global";
export const objKey = (
  kind: "cluster" | "host" | "folder" | "vm",
  id: string,
): ObjKey => `${kind}:${id}`;

/**
 * Where a folder is managed from: its cluster or standalone host. Renaming or
 * deleting a folder needs `folder.manage` there - a permission on the folder
 * itself covers its VMs, never the folder (backend rule).
 */
export const folderOwnerKey = (folder: Pick<Folder, "clusterId" | "hostId">): ObjKey =>
  folder.clusterId ? objKey("cluster", folder.clusterId) : objKey("host", folder.hostId!);

/** `folderOwnerKey` for a folder id (null while the folder list loads). */
export function useFolderOwnerKey(folderId: string | null | undefined): ObjKey | null {
  const folders = useQuery({ ...foldersQuery({}), enabled: !!folderId });
  const folder = folderId ? folders.data?.find((f) => f.id === folderId) : undefined;
  return folder ? folderOwnerKey(folder) : null;
}

const MAX_IDS = 200;

type Waiter = {
  resolve: (privs: Privilege[] | null) => void;
  reject: (err: unknown) => void;
};
let queue = new Map<ObjKey, Waiter[]>();
let scheduled = false;

async function flush() {
  scheduled = false;
  const batch = queue;
  queue = new Map();
  const keys = [...batch.keys()];
  for (let i = 0; i < keys.length; i += MAX_IDS) {
    const chunk = keys.slice(i, i + MAX_IDS);
    try {
      const { items } = await getMyPrivileges(chunk);
      for (const key of chunk)
        for (const w of batch.get(key)!) w.resolve(items[key] ?? null);
    } catch (err) {
      for (const key of chunk) for (const w of batch.get(key)!) w.reject(err);
    }
  }
}

function loadPrivileges(key: ObjKey): Promise<Privilege[] | null> {
  return new Promise((resolve, reject) => {
    const waiters = queue.get(key) ?? [];
    waiters.push({ resolve, reject });
    queue.set(key, waiters);
    if (!scheduled) {
      scheduled = true;
      setTimeout(() => void flush(), 0);
    }
  });
}

export interface ObjectPrivileges {
  /** True when the caller holds `privilege` on the object. False while loading. */
  can: (privilege: Privilege | null | undefined) => boolean;
  /** The object is visible to the caller (false while loading). */
  visible: boolean;
  loading: boolean;
}

/** The caller's privileges on one object (`null` key: nothing selected). */
export function usePrivileges(key: ObjKey | null): ObjectPrivileges {
  const { isAdmin } = useAuth();
  const query = useQuery({
    queryKey: qk.myPrivileges(key ?? "-"),
    queryFn: () => loadPrivileges(key!),
    enabled: !!key && !isAdmin,
    staleTime: 60_000,
  });
  if (isAdmin) return { can: () => true, visible: true, loading: false };
  const privs = query.data;
  return {
    can: (p) => p === null || (!!p && !!privs?.includes(p)),
    visible: privs != null,
    loading: query.isPending && !!key,
  };
}

/** One privilege on many objects (one batched request): the keys that have it. */
export function useKeysWith(privilege: Privilege, keys: ObjKey[]): Set<ObjKey> {
  const { isAdmin } = useAuth();
  const results = useQueries({
    queries: keys.map((key) => ({
      queryKey: qk.myPrivileges(key),
      queryFn: () => loadPrivileges(key),
      enabled: !isAdmin,
      staleTime: 60_000,
    })),
  });
  if (isAdmin) return new Set(keys);
  return new Set(keys.filter((_, i) => results[i].data?.includes(privilege)));
}

/** Shorthand: one privilege on one object. */
export function useCan(privilege: Privilege, key: ObjKey | null): boolean {
  return usePrivileges(key).can(privilege);
}

/** A privilege granted globally (menus for cross-inventory screens). */
export function useGlobalCan(privilege: Privilege): boolean {
  return useCan(privilege, GLOBAL_KEY);
}

/** VM action kind → the privilege it needs (from the backend's catalog). */
export function useVmActionPrivileges(): Record<string, Privilege | null> {
  const catalog = useQuery(rbacCatalogQuery());
  return catalog.data?.vmActions ?? {};
}

/**
 * Whether the caller may run a VM action (catalog `vmActions` kind, e.g. `edit`,
 * `notes_edit`) on this VM. False while the catalog or the privileges load.
 */
export function useVmActionCan(vmId: string): (action: string) => boolean {
  const privs = usePrivileges(objKey("vm", vmId));
  const actionPriv = useVmActionPrivileges();
  return (action) => privs.can(actionPriv[action]);
}

/** The ids of the VMs on which the caller may run `action` (one batched request). */
export function useVmsAllowedTo(action: string, vmIds: string[]): Set<string> {
  const priv = useVmActionPrivileges()[action];
  const keys = vmIds.map((id) => objKey("vm", id));
  // the catalog names the privilege; until it loads nothing is allowed
  const withPriv = useKeysWith(priv ?? "vm.config", keys);
  const { isAdmin } = useAuth();
  if (isAdmin || priv === null) return new Set(vmIds);
  if (priv === undefined) return new Set();
  return new Set(vmIds.filter((id) => withPriv.has(objKey("vm", id))));
}
