import type { TabItem } from "~/components/win95";
import type { ObjectPrivileges } from "./privileges";

/** The audit log of this object - needs `audit.read` on it. */
export const EVENTS_TAB: TabItem = { id: "events", label: "Events" };
/** Who may do what here - needs `rbac.manage` on it. */
export const PERMISSIONS_TAB: TabItem = { id: "permissions", label: "Permissions" };

/** The Events / Permissions tabs the caller's privileges allow on an object. */
export function privilegedTabs(privs: ObjectPrivileges): TabItem[] {
  return [
    ...(privs.can("audit.read") ? [EVENTS_TAB] : []),
    ...(privs.can("rbac.manage") ? [PERMISSIONS_TAB] : []),
  ];
}
