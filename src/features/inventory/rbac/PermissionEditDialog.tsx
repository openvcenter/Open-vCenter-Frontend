import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Dialog, Dropdown, TextField, cn } from "~/components/win95";
import { principalsQuery, rolesQuery } from "~/api/queries";
import type { Permission, PermissionScopeType, PrincipalType } from "~/api/types";
import { ApiError } from "~/api/client";
import { useCreatePermission, useUpdatePermission } from "./mutations";
import { PrincipalCell } from "./PermissionsPanel";

/** Add a permission on an object, or change the role / propagate flag of an
 *  existing one (its role or group is fixed - remove and re-add to change it). */
export function PermissionEditDialog({
  scopeType,
  scopeId,
  permission,
  onClose,
}: {
  scopeType: PermissionScopeType;
  scopeId: string | null;
  permission: Permission | null;
  onClose: () => void;
}) {
  const roles = useQuery(rolesQuery());
  const create = useCreatePermission();
  const update = useUpdatePermission();
  const [principalType, setPrincipalType] = React.useState<PrincipalType>(
    permission?.principalType ?? "group",
  );
  const [principalId, setPrincipalId] = React.useState(permission?.principalId ?? "");
  const [roleId, setRoleId] = React.useState(permission?.roleId ?? "");
  const [propagate, setPropagate] = React.useState(permission?.propagate ?? true);
  const [error, setError] = React.useState<string | null>(null);

  const needle = principalId.trim();
  const suggestions = useQuery({ ...principalsQuery(needle), enabled: !permission });
  const matches = (suggestions.data ?? []).filter(
    (s) => s.type === principalType && s.id !== needle,
  );

  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : String(e));
  const save = () => {
    if (permission) {
      update.mutate(
        { id: permission.id, roleId, propagate },
        { onSuccess: onClose, onError: fail },
      );
    } else {
      create.mutate(
        { scopeType, scopeId, principalType, principalId: needle, roleId, propagate },
        { onSuccess: onClose, onError: fail },
      );
    }
  };

  const busy = create.isPending || update.isPending;
  const unchanged =
    !!permission && roleId === permission.roleId && propagate === permission.propagate;

  return (
    <Dialog
      title={permission ? "Edit Permission" : "Add Permission"}
      onClose={onClose}
      width={460}
      error={error}
      footer={
        <>
          <Button onClick={save} disabled={!needle || !roleId || busy || unchanged}>
            OK
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {permission ? (
          <div>
            <p className="mb-1">Granted to</p>
            <PrincipalCell type={permission.principalType} id={permission.principalId} />
          </div>
        ) : (
          <>
            <fieldset className="flex gap-4">
              <legend className="mb-1">Grant to</legend>
              {(["group", "role"] as const).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-1">
                  <input
                    type="radio"
                    name="principal-type"
                    checked={principalType === t}
                    onChange={() => setPrincipalType(t)}
                  />
                  {t === "group" ? "Group" : "Role"}
                </label>
              ))}
            </fieldset>
            <div>
              <TextField
                label={principalType === "group" ? "Group name" : "Role name"}
                autoFocus
                value={principalId}
                maxLength={255}
                className="w-full"
                onChange={(e) => setPrincipalId(e.target.value)}
              />
              <p className="mt-1 text-disabled-text">
                As the identity provider names it in the token.
              </p>
              {matches.length ? (
                <div className="bevel-sunken mt-1 max-h-[110px] overflow-auto bg-window">
                  {matches.slice(0, 20).map((m) => (
                    <button
                      key={`${m.type}:${m.id}`}
                      type="button"
                      className={cn(
                        "block w-full cursor-default px-2 py-[2px] text-left",
                        "hover:bg-selection hover:text-selection-text",
                      )}
                      onClick={() => setPrincipalId(m.id)}
                    >
                      {m.id}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        )}
        <Dropdown
          label="Role"
          value={roleId}
          onChange={setRoleId}
          options={(roles.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
          placeholder="Select a role"
        />
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5"
            checked={propagate}
            onChange={(e) => setPropagate(e.target.checked)}
          />
          Propagate to the objects below
        </label>
      </div>
    </Dialog>
  );
}
