import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { Button, Dialog, GroupBox, Icon, Table, Td, TextField, Th, cn } from "~/components/win95";
import { effectiveQuery, rbacCatalogQuery } from "~/api/queries";
import type { Principal, PrincipalType } from "~/api/types";

const PATH_LABEL: Record<string, string> = {
  object: "Inheritance",
  vm: "On the VM itself",
  folder: "Through its folder",
  host: "Through its host",
};

const LEVEL_LABEL: Record<string, string> = {
  global: "Global",
  cluster: "Cluster",
  host: "Host",
  folder: "Folder",
  vm: "VM",
};

/** What one role or group may do on an object, and which permission decides
 *  it at each level of each inheritance path (`GET /rbac/effective`). */
export function EffectivePermissionsDialog({
  object,
  onClose,
}: {
  object: string;
  onClose: () => void;
}) {
  const catalog = useQuery(rbacCatalogQuery());
  const [type, setType] = React.useState<PrincipalType>("group");
  const [name, setName] = React.useState("");
  const [principal, setPrincipal] = React.useState<Principal | null>(null);
  const result = useQuery({
    ...effectiveQuery(principal ?? { type: "group", id: "" }, object),
    enabled: !!principal,
  });
  const granted = new Set(result.data?.privileges ?? []);

  return (
    <Dialog
      title="Effective Permissions"
      onClose={onClose}
      width={640}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <fieldset className="flex gap-3 pb-1">
            {(["group", "role"] as const).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-1">
                <input
                  type="radio"
                  name="effective-type"
                  checked={type === t}
                  onChange={() => setType(t)}
                />
                {t === "group" ? "Group" : "Role"}
              </label>
            ))}
          </fieldset>
          <div className="flex-1">
            <TextField
              label="Name"
              autoFocus
              value={name}
              className="w-full"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && name.trim() && setPrincipal({ type, id: name.trim() })
              }
            />
          </div>
          <Button
            icon={Search}
            disabled={!name.trim()}
            onClick={() => setPrincipal({ type, id: name.trim() })}
          >
            Check
          </Button>
        </div>

        {result.isError ? <p className="text-danger">{result.error.message}</p> : null}
        {result.data ? (
          <>
            <p>
              {result.data.superuser
                ? "Superuser role: every privilege everywhere."
                : result.data.visible
                  ? `Visible, ${granted.size} privilege${granted.size === 1 ? "" : "s"}.`
                  : "Not visible here."}
            </p>
            {result.data.paths.map((path) => (
              <GroupBox key={path.name} label={PATH_LABEL[path.name] ?? path.name}>
                <Table>
                  <thead>
                    <tr>
                      <Th>Level</Th>
                      <Th>Permissions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {path.levels.map((lv) => (
                      <tr
                        key={`${lv.scopeType}:${lv.scopeId}`}
                        className={cn(
                          "border-t border-surface-2",
                          lv.winner && "bg-info-bg",
                        )}
                      >
                        <Td>
                          {LEVEL_LABEL[lv.scopeType]}
                          {lv.scopeType !== "global" ? `: ${lv.scopeName ?? lv.scopeId}` : ""}
                          {lv.winner ? <span className="text-disabled-text"> (decides)</span> : null}
                        </Td>
                        <Td>
                          {lv.permissions.length === 0 ? (
                            <span className="text-disabled-text">-</span>
                          ) : (
                            lv.permissions.map((p) => p.roleName).join(", ")
                          )}
                          {lv.blocked ? <span className="text-danger"> - blocked</span> : null}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </GroupBox>
            ))}
            {result.data.visible && !result.data.superuser ? (
              <GroupBox label="Privileges">
                <div className="grid grid-cols-2 gap-x-3">
                  {(catalog.data?.privileges ?? []).map((p) => (
                    <span
                      key={p.id}
                      className={cn(
                        "flex items-center gap-1",
                        !granted.has(p.id) && "text-disabled-text",
                      )}
                    >
                      <Icon
                        icon={Check}
                        size={12}
                        className={granted.has(p.id) ? "text-success" : "invisible"}
                      />
                      {p.label}
                    </span>
                  ))}
                </div>
              </GroupBox>
            ) : null}
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
