/** Application Preferences tabs and the global privilege each one needs. A new
 *  option group is one more entry here and a panel in the dialog. */
export const APP_PREFERENCES_TABS = [
  { id: 'general', label: 'General', privilege: 'settings.manage' },
  { id: 'roles', label: 'Roles', privilege: 'rbac.manage' },
  { id: 'global-permissions', label: 'Global Permissions', privilege: 'rbac.manage' },
] as const

export type AppPreferencesTab = (typeof APP_PREFERENCES_TABS)[number]['id']
