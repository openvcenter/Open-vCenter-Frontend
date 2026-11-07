import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Dialog, Dropdown, GroupBox, Tabs } from "~/components/win95";
import type { TabItem } from "~/components/win95";
import { settingsQuery } from "~/api/queries";
import type { AppSettings } from "~/api/types";
import { confirm } from "../confirm";
import { errorText } from "../detail/vmActions/errorText";
import { intervalLabel, retentionLabel } from "../format";
import { organizeDialog } from "../organize/dialogStore";
import { PermissionsPanel } from "../rbac/PermissionsPanel";
import { RolesPanel } from "../rbac/RolesPanel";
import { usePrivileges } from "../rbac/privileges";
import { useUpdateSettings } from "./mutations";
import { APP_PREFERENCES_TABS, type AppPreferencesTab } from "./tabs";

type Draft = Pick<
  AppSettings,
  "metricsRetentionSeconds" | "metricsIntervalSeconds" | "vmConsoleNonAdminAccess"
>;

const draftOf = (s: AppSettings): Draft => ({
  metricsRetentionSeconds: s.metricsRetentionSeconds,
  metricsIntervalSeconds: s.metricsIntervalSeconds,
  vmConsoleNonAdminAccess: s.vmConsoleNonAdminAccess,
});

/** Administration ▸ Application Preferences. General edits `/settings`
 *  (`settings.manage`, Apply); Roles / Global Permissions need `rbac.manage`. */
export function ApplicationPreferencesDialog({
  initialTab,
}: {
  initialTab?: AppPreferencesTab;
}) {
  const global = usePrivileges("global");
  const tabs: TabItem[] = APP_PREFERENCES_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    disabled: !global.can(t.privilege),
  }));
  const firstEnabled = (tabs.find((t) => !t.disabled)?.id ?? "general") as AppPreferencesTab;
  const [tab, setTab] = React.useState<AppPreferencesTab>(
    initialTab && !tabs.find((t) => t.id === initialTab)?.disabled ? initialTab : firstEnabled,
  );

  const settings = useQuery(settingsQuery());
  const update = useUpdateSettings();
  const [draft, setDraft] = React.useState<Draft | null>(null);
  // start from the stored values once they are there
  const current = draft ?? (settings.data ? draftOf(settings.data) : null);
  const settingsDirty =
    !!draft &&
    !!settings.data &&
    (Object.keys(draft) as (keyof Draft)[]).some((k) => draft[k] !== settings.data[k]);

  const [rolesDirty, setRolesDirty] = React.useState(false);

  const changeTab = async (next: string) => {
    if (
      tab === "roles" &&
      rolesDirty &&
      !(await confirm({
        title: "Unsaved Changes",
        message: "Discard the changes to the selected role?",
        confirmLabel: "Discard",
      }))
    )
      return;
    if (tab === "roles") setRolesDirty(false);
    setTab(next as AppPreferencesTab);
  };

  const apply = () =>
    draft &&
    update.mutate(draft, {
      onSuccess: (s) => setDraft(draftOf(s)),
    });

  const patch = (p: Partial<Draft>) => current && setDraft({ ...current, ...p });
  const canEditSettings = global.can("settings.manage");

  return (
    <Dialog
      title="Application Preferences"
      onClose={organizeDialog.close}
      width={860}
      dirty={settingsDirty || rolesDirty}
      error={errorText(update.error)}
      footer={
        <>
          <Button
            className="font-bold"
            disabled={!canEditSettings || !settingsDirty || update.isPending}
            onClick={apply}
          >
            Apply
          </Button>
          <Button onClick={() => organizeDialog.close()}>Close</Button>
        </>
      }
    >
      <div className="flex h-[520px] flex-col">
        <Tabs tabs={tabs} value={tab} onChange={(id) => void changeTab(id)} className="flex-1">
          {tab === "general" && (
            <div className="flex flex-col gap-3">
              <GroupBox label="Consoles">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    disabled={!current || !canEditSettings}
                    checked={current?.vmConsoleNonAdminAccess ?? false}
                    onChange={(e) => patch({ vmConsoleNonAdminAccess: e.target.checked })}
                  />
                  Allow non-Hyper-V administrators to open a VM console
                </label>
              </GroupBox>
              <GroupBox label="Metrics">
                <div className="flex flex-wrap gap-4">
                  <Dropdown
                    label="Collect a sample every"
                    className="w-[200px]"
                    disabled={!current || !canEditSettings}
                    value={String(current?.metricsIntervalSeconds ?? "")}
                    onChange={(v) => patch({ metricsIntervalSeconds: Number(v) })}
                    options={(settings.data?.metricsIntervalOptions ?? []).map((s) => ({
                      value: String(s),
                      label: intervalLabel(s),
                    }))}
                  />
                  <Dropdown
                    label="Keep host and VM metrics for"
                    className="w-[200px]"
                    disabled={!current || !canEditSettings}
                    value={String(current?.metricsRetentionSeconds ?? "")}
                    onChange={(v) => patch({ metricsRetentionSeconds: Number(v) })}
                    options={(settings.data?.metricsRetentionOptions ?? []).map((s) => ({
                      value: String(s),
                      label: retentionLabel(s),
                    }))}
                  />
                </div>
              </GroupBox>
            </div>
          )}
          {tab === "roles" && <RolesPanel onDirtyChange={setRolesDirty} />}
          {tab === "global-permissions" && (
            <PermissionsPanel scopeType="global" scopeId={null} />
          )}
        </Tabs>
      </div>
    </Dialog>
  );
}
