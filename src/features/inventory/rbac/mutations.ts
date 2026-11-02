import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  cloneRole,
  createPermission,
  createRole,
  deletePermission,
  deleteRole,
  updatePermission,
  updateRole,
} from '~/api/endpoints/rbac'
import type { PermissionScope } from '~/api/endpoints/rbac'
import type { Privilege } from '~/api/types'
import { ApiError } from '~/api/client'
import { statusMessage } from '../actions/statusMessage'

/** RBAC writes change what the caller sees, so the inventory refetches too. */
const RBAC_KEYS = [['rbac'], ['me'], ['clusters'], ['hosts'], ['folders'], ['vms']] as const

function useRbacMutation<TArgs, TData>(
  fn: (args: TArgs) => Promise<TData>,
  message: (data: TData, args: TArgs) => string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, args) => {
      for (const key of RBAC_KEYS) queryClient.invalidateQueries({ queryKey: key })
      statusMessage.set(message(data, args))
    },
    onError: (err) => {
      statusMessage.set(err instanceof ApiError ? err.message : String(err))
    },
  })
}

export const useCreateRole = () =>
  useRbacMutation(
    (body: { name: string; description?: string | null; privileges: Privilege[] }) =>
      createRole(body),
    (r) => `Created role "${r.name}"`,
  )

export const useUpdateRole = () =>
  useRbacMutation(
    (input: {
      id: string
      body: { name?: string; description?: string | null; privileges?: Privilege[] }
    }) => updateRole(input.id, input.body),
    (r) => `Saved role "${r.name}"`,
  )

export const useCloneRole = () =>
  useRbacMutation(
    (input: { id: string; name: string }) => cloneRole(input.id, input.name),
    (r) => `Created role "${r.name}"`,
  )

export const useDeleteRole = () =>
  useRbacMutation(
    (input: { id: string; name: string }) => deleteRole(input.id),
    (_, input) => `Deleted role "${input.name}"`,
  )

export const useCreatePermission = () =>
  useRbacMutation(
    (
      body: PermissionScope & {
        group: string
        roleId: string
        propagate: boolean
      },
    ) => createPermission(body),
    (p) => `Granted ${p.roleName} to group "${p.group}"`,
  )

export const useUpdatePermission = () =>
  useRbacMutation(
    (input: { id: string; roleId?: string; propagate?: boolean }) =>
      updatePermission(input.id, { roleId: input.roleId, propagate: input.propagate }),
    (p) => `Updated the permission of group "${p.group}"`,
  )

export const useDeletePermission = () =>
  useRbacMutation(
    (input: { id: string; label: string }) => deletePermission(input.id),
    (_, input) => `Removed the permission of ${input.label}`,
  )
