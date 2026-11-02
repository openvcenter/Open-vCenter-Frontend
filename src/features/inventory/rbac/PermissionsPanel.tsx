import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, ShieldQuestion, Trash2, Users } from "lucide-react";
import { Button, Icon, Table, Td, Th } from "~/components/win95";
import { permissionsQuery } from "~/api/queries";
import type { Permission, PermissionScopeType } from "~/api/types";
import { confirm } from "../confirm";
import { useInventorySelection } from "../selection";
import { useDeletePermission } from "./mutations";
import { PermissionEditDialog } from "./PermissionEditDialog";
import { EffectivePermissionsDialog } from "./EffectivePermissionsDialog";
import { PERMISSIONS_TAB } from "./objectTabs";

export function GroupCell({ group }: { group: string }) {
  return (
    <span className="flex items-center gap-1">
      <Icon icon={Users} size={13} className="text-accent" />
      {group}
    </span>
  );
}

const SCOPE_LABEL: Record<PermissionScopeType, string> = {
  global: "Global",
  cluster: "Cluster",
  host: "Host",
  folder: "Folder",
  vm: "VM",
};

/**
 * Permissions on one object: the ones defined here (editable) and the ones
 * inherited from above (read-only, click "Defined in" to go there). Shown to
 * callers with `rbac.manage` on the object; the backend enforces it.
 */
export function PermissionsPanel({
  scopeType,
  scopeId,
}: {
  scopeType: PermissionScopeType;
  scopeId: string | null;
}) {
  const perms = useQuery(permissionsQuery({ scopeType, scopeId }));
  const del = useDeletePermission();
  const { select } = useInventorySelection();
  const [editing, setEditing] = React.useState<Permission | "new" | null>(null);
  const [effectiveOpen, setEffectiveOpen] = React.useState(false);

  const remove = async (p: Permission) => {
    const ok = await confirm({
      title: "Remove Permission",
      message: `Remove ${p.roleName} from group "${p.group}" here?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (ok) del.mutate({ id: p.id, label: `group "${p.group}"` });
  };

  const goTo = (p: Permission) => {
    if (p.scopeType === "global" || !p.scopeId) return;
    select({ kind: p.scopeType, id: p.scopeId }, PERMISSIONS_TAB.id);
  };

  const direct = perms.data?.direct ?? [];
  const inherited = perms.data?.inherited ?? [];
  const rows: { p: Permission; inherited: boolean }[] = [
    ...direct.map((p) => ({ p, inherited: false })),
    ...inherited.map((p) => ({ p, inherited: true })),
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        <Button icon={Plus} onClick={() => setEditing("new")}>
          Add Permission
        </Button>
        <Button icon={ShieldQuestion} onClick={() => setEffectiveOpen(true)}>
          Effective Permissions
        </Button>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Group</Th>
            <Th>Granted role</Th>
            <Th className="w-[90px]">Propagate</Th>
            <Th>Defined in</Th>
            <Th className="w-[64px]"> </Th>
          </tr>
        </thead>
        <tbody>
          {perms.isError ? (
            <tr>
              <Td colSpan={5} className="text-danger">
                {perms.error.message}
              </Td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <Td colSpan={5} className="text-disabled-text">
                {perms.isPending ? "Loading…" : "No permissions apply here."}
              </Td>
            </tr>
          ) : (
            rows.map(({ p, inherited: inh }) => (
              <tr key={p.id} className="border-t border-surface-2">
                <Td>
                  <GroupCell group={p.group} />
                </Td>
                <Td>{p.roleName}</Td>
                <Td>{p.propagate ? "Yes" : "No"}</Td>
                <Td>
                  {inh ? (
                    p.scopeType === "global" ? (
                      "Global"
                    ) : (
                      <button
                        type="button"
                        className="cursor-pointer text-link underline"
                        onClick={() => goTo(p)}
                      >
                        {SCOPE_LABEL[p.scopeType]}: {p.scopeName ?? p.scopeId}
                      </button>
                    )
                  ) : (
                    "This object"
                  )}
                </Td>
                <Td>
                  {inh ? null : (
                    <div className="flex justify-end gap-1">
                      <Button
                        title="Edit"
                        aria-label="Edit"
                        className="min-h-0 min-w-0 px-1.5 py-[2px]"
                        onClick={() => setEditing(p)}
                      >
                        <Icon icon={Pencil} size={13} />
                      </Button>
                      <Button
                        title="Remove"
                        aria-label="Remove"
                        className="min-h-0 min-w-0 px-1.5 py-[2px]"
                        onClick={() => void remove(p)}
                      >
                        <Icon icon={Trash2} size={13} />
                      </Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      <p className="text-disabled-text">
        Permissions are granted to groups from the identity provider.
        On a VM they override everything inherited; otherwise the most specific
        level wins, and a VM gets the union of its folder and host.
      </p>
      {editing ? (
        <PermissionEditDialog
          scopeType={scopeType}
          scopeId={scopeId}
          permission={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {effectiveOpen ? (
        <EffectivePermissionsDialog
          object={scopeType === "global" ? "global" : `${scopeType}:${scopeId}`}
          onClose={() => setEffectiveOpen(false)}
        />
      ) : null}
    </div>
  );
}
