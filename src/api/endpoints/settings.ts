import { request } from '../client'
import type { AppSettings } from '../types'

// Application-wide preferences. Every signed-in user reads them; changing them
// needs `settings.manage` globally.

export const getSettings = (signal?: AbortSignal) =>
  request<AppSettings>('/settings', { signal })

/** Only the fields sent are changed. */
export const updateSettings = (
  body: Partial<Pick<AppSettings, 'metricsRetentionSeconds' | 'vmConsoleNonAdminAccess'>>,
) => request<AppSettings>('/settings', { method: 'PATCH', body })
