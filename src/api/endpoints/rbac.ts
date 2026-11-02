import { request } from '../client'
import type {
  ConsoleTarget,
  EffectivePermissions,
  Me,
  Permission,
  PermissionList,
  PermissionScopeType,
  Privilege,
  RbacCatalog,
  Role,
} from '../types'

// Access control. Roles and permissions need `rbac.manage` (roles: globally;
// permissions: on their object); the backend answers 403 otherwise.

export const getMe = (signal?: AbortSignal) => request<Me>('/me', { signal })

export const getRbacCatalog = (signal?: AbortSignal) =>
  request<RbacCatalog>('/rbac/catalog', { signal })

/** `ids`: `global` or `<scopeType>:<id>`. `null` = not visible. At most 200. */
export const getMyPrivileges = (ids: string[], signal?: AbortSignal) =>
  request<{ items: Record<string, Privilege[] | null> }>('/me/privileges', {
    query: { ids: ids.join(',') },
    signal,
  })

export const getRoles = (signal?: AbortSignal) => request<Role[]>('/roles', { signal })

export const createRole = (body: {
  name: string
  description?: string | null
  privileges: Privilege[]
}) => request<Role>('/roles', { method: 'POST', body })

export const updateRole = (
  id: string,
  body: { name?: string; description?: string | null; privileges?: Privilege[] },
) => request<Role>(`/roles/${id}`, { method: 'PATCH', body })

export const cloneRole = (id: string, name: string) =>
  request<Role>(`/roles/${id}/clone`, { method: 'POST', body: { name } })

/** 409 `ROLE_IN_USE` while a permission uses it; built-ins: 409 `ROLE_BUILTIN`. */
export const deleteRole = (id: string) =>
  request<void>(`/roles/${id}`, { method: 'DELETE' })

export interface PermissionScope {
  scopeType: PermissionScopeType
  scopeId: string | null
}

export const getPermissions = (scope: PermissionScope, signal?: AbortSignal) =>
  request<PermissionList>('/permissions', { query: { ...scope }, signal })

export const createPermission = (
  body: PermissionScope & {
    group: string
    roleId: string
    propagate: boolean
  },
) => request<Permission>('/permissions', { method: 'POST', body })

export const updatePermission = (
  id: string,
  body: { roleId?: string; propagate?: boolean },
) => request<Permission>(`/permissions/${id}`, { method: 'PATCH', body })

export const deletePermission = (id: string) =>
  request<void>(`/permissions/${id}`, { method: 'DELETE' })

/** Group names to suggest: the caller's own plus those already used. */
export const getGroups = (q: string, signal?: AbortSignal) =>
  request<string[]>('/rbac/groups', { query: { q }, signal })

export const getEffectivePermissions = (
  group: string,
  object: string,
  signal?: AbortSignal,
) =>
  request<EffectivePermissions>('/rbac/effective', {
    query: { group, object },
    signal,
  })

export const getVmConsole = (id: string, signal?: AbortSignal) =>
  request<ConsoleTarget>(`/vms/${id}/console`, { signal })

export const getHostConsole = (id: string, signal?: AbortSignal) =>
  request<ConsoleTarget>(`/hosts/${id}/console`, { signal })
