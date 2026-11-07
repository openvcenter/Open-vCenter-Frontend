import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Lock, Plus, Save, Trash2 } from "lucide-react";
import {
  ActionRow,
  Button,
  GroupBox,
  Icon,
  Table,
  Td,
  TextField,
  Th,
  cn,
} from "~/components/win95";
import { rbacCatalogQuery, rolesQuery } from "~/api/queries";
import type { PrivilegeInfo, Role } from "~/api/types";
import { ApiError } from "~/api/client";
import { confirm } from "../confirm";
import { useCloneRole, useCreateRole, useDeleteRole, useUpdateRole } from "./mutations";

interface Draft {
  name: string;
  description: string;
  privileges: Set<string>;
}

const draftOf = (role: Role | null): Draft => ({
  name: role?.name ?? "",
  description: role?.description ?? "",
  privileges: new Set(role?.privileges ?? []),
});

const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

/** Application Preferences ▸ Roles. Built-in roles are read-only; custom roles
 *  are created, cloned, edited and deleted here (`rbac.manage` globally).
 *  `onDirtyChange` tells the dialog about unsaved edits. */
export function RolesPanel({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const roles = useQuery(rolesQuery());
  const catalog = useQuery(rbacCatalogQuery());
  const create = useCreateRole();
  const update = useUpdateRole();
  const clone = useCloneRole();
  const del = useDeleteRole();

  // null = a new, unsaved role
  const [selectedId, setSelectedId] = React.useState<string | null | undefined>(undefined);
  const [draft, setDraft] = React.useState<Draft>(draftOf(null));
  const [error, setError] = React.useState<string | null>(null);

  const list = roles.data ?? [];
  const selected = list.find((r) => r.id === selectedId) ?? null;
  const isNew = selectedId === null;
  const readOnly = !!selected?.builtin;

  // first load: select the first role
  React.useEffect(() => {
    if (selectedId === undefined && list.length) {
      setSelectedId(list[0].id);
      setDraft(draftOf(list[0]));
    }
  }, [list, selectedId]);

  const dirty = isNew
    ? !!draft.name.trim() || draft.privileges.size > 0
    : !!selected &&
      (draft.name !== selected.name ||
        draft.description !== (selected.description ?? "") ||
        !sameSet(draft.privileges, new Set(selected.privileges)));

  React.useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : String(e));

  const pick = async (role: Role) => {
    if (role.id === selectedId) return;
    if (
      dirty &&
      !(await confirm({
        title: "Unsaved Changes",
        message: `Discard the changes to "${draft.name || "the new role"}"?`,
        confirmLabel: "Discard",
      }))
    )
      return;
    setError(null);
    setSelectedId(role.id);
    setDraft(draftOf(role));
  };

  const startNew = () => {
    setError(null);
    setSelectedId(null);
    setDraft(draftOf(null));
  };

  const save = () => {
    const body = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      privileges: [...draft.privileges],
    };
    const done = {
      onSuccess: (r: Role) => {
        setError(null);
        setSelectedId(r.id);
        setDraft(draftOf(r));
      },
      onError: fail,
    };
    if (isNew) create.mutate(body, done);
    else if (selected) update.mutate({ id: selected.id, body }, done);
  };

  const cloneSelected = () => {
    if (!selected) return;
    const base = `${selected.name} copy`;
    let name = base;
    for (let n = 2; list.some((r) => r.name.toLowerCase() === name.toLowerCase()); n++)
      name = `${base} ${n}`;
    clone.mutate(
      { id: selected.id, name },
      {
        onSuccess: (r) => {
          setError(null);
          setSelectedId(r.id);
          setDraft(draftOf(r));
        },
        onError: fail,
      },
    );
  };

  const removeSelected = async () => {
    if (!selected) return;
    const ok = await confirm({
      title: "Delete Role",
      message: `Delete role "${selected.name}"?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    del.mutate(
      { id: selected.id, name: selected.name },
      {
        onSuccess: () => {
          setError(null);
          setSelectedId(undefined);
        },
        onError: fail,
      },
    );
  };

  const toggle = (id: string) =>
    setDraft((d) => {
      const privileges = new Set(d.privileges);
      if (privileges.has(id)) privileges.delete(id);
      else privileges.add(id);
      return { ...d, privileges };
    });

  const groups = groupPrivileges(catalog.data?.privileges ?? []);
  const busy = create.isPending || update.isPending;

  return (
    <div className="flex gap-3">
      <div className="flex w-[260px] shrink-0 flex-col gap-2">
        <Table wrapperClassName="h-[420px]">
          <thead>
            <tr>
              <Th>Role</Th>
              <Th className="w-[56px] text-right">In use</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <ActionRow
                key={r.id}
                onActivate={() => void pick(r)}
                aria-selected={r.id === selectedId}
                className="border-t border-surface-2"
              >
                <Td>
                  <span className="flex items-center gap-1">
                    {r.builtin ? (
                      <Icon icon={Lock} size={12} className="text-disabled-text" />
                    ) : null}
                    {r.name}
                  </span>
                </Td>
                <Td className="text-right">{r.permissionCount}</Td>
              </ActionRow>
            ))}
            {isNew ? (
              <tr className="border-t border-surface-2 bg-selection text-selection-text">
                <Td colSpan={2}>{draft.name.trim() || "New role"}</Td>
              </tr>
            ) : null}
          </tbody>
        </Table>
        <div className="flex gap-1">
          <Button icon={Plus} onClick={startNew}>
            New
          </Button>
          <Button icon={Copy} onClick={cloneSelected} disabled={!selected || clone.isPending}>
            Clone
          </Button>
          <Button
            icon={Trash2}
            onClick={() => void removeSelected()}
            disabled={!selected || selected.builtin || del.isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <TextField
              label="Name"
              value={draft.name}
              maxLength={128}
              className="w-full"
              disabled={readOnly}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="flex-[2]">
            <TextField
              label="Description"
              value={draft.description}
              maxLength={512}
              className="w-full"
              disabled={readOnly}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </div>
        </div>
        {readOnly ? (
          <p className="text-disabled-text">
            Built-in role - it cannot be changed. Clone it to make an editable copy.
          </p>
        ) : null}
        <div className="grid max-h-[330px] grid-cols-2 gap-2 overflow-auto">
          {groups.map(([group, privs]) => (
            <GroupBox key={group} label={group}>
              <div className="flex flex-col">
                {privs.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      "flex items-start gap-2 px-1 py-[2px]",
                      readOnly ? "text-disabled-text" : "cursor-pointer hover:bg-surface-2",
                    )}
                    title={p.id}
                  >
                    <input
                      type="checkbox"
                      className="mt-[2px] h-3.5 w-3.5"
                      disabled={readOnly}
                      checked={draft.privileges.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </GroupBox>
          ))}
        </div>
        {error ? <p className="text-danger">{error}</p> : null}
        <div className="flex justify-end">
          <Button
            icon={Save}
            onClick={save}
            disabled={readOnly || !dirty || !draft.name.trim() || busy}
          >
            {isNew ? "Create" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function groupPrivileges(privileges: PrivilegeInfo[]): [string, PrivilegeInfo[]][] {
  const groups = new Map<string, PrivilegeInfo[]>();
  for (const p of privileges) {
    const list = groups.get(p.group) ?? [];
    list.push(p);
    groups.set(p.group, list);
  }
  return [...groups.entries()];
}
