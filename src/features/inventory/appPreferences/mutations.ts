import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateSettings } from '~/api/endpoints/settings'
import { statusMessage } from '../actions/statusMessage'

/** The metrics panels read the retention window, and a shorter one prunes
 *  samples, so their queries refetch too. */
export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey.includes('metrics'),
      })
      statusMessage.set('Application preferences saved')
    },
  })
}
