import type { ReactNode } from "react";
import { GroupBox, PropertyList } from "~/components/win95";
import type { HostSettings } from "~/api/types";

/**
 * Host configuration values for the host "Configuration" tab, as the agent last
 * reported them (every 30 min). Display only - no pass/fail styling.
 */

type Row = { label: string; value: ReactNode };

const rows = (items: Row[]) =>
  items.map((r) => ({
    ...r,
    value: r.value == null || r.value === "" ? "-" : r.value,
  }));
const onOff = (v: boolean | undefined) => (v == null ? null : v ? "Enabled" : "Disabled");
const yesNo = (v: boolean | undefined) => (v == null ? null : v ? "Yes" : "No");

function ipv6Label(mask: number | undefined) {
  if (mask == null) return null;
  if (mask === 0) return "Enabled";
  if ((mask & 0xff) === 0xff) return "Disabled";
  if (mask === 0x20) return "Prefer IPv4";
  return `Partially disabled (0x${mask.toString(16).toUpperCase()})`;
}

function pageFileLabel(pf: HostSettings["pageFile"]) {
  if (!pf) return null;
  if (pf.automatic) return "Managed automatically (all drives)";
  if (!pf.files.length) return "None";
  return pf.files
    .map((f) =>
      f.systemManaged
        ? `${f.path} (system managed)`
        : `${f.path} (${f.initialMb} - ${f.maximumMb} MB)`,
    )
    .join(", ");
}

export function HostSettingsPanel({ settings }: { settings?: HostSettings | null }) {
  if (!settings) {
    return <p>Host settings not reported yet (requires an up-to-date agent).</p>;
  }
  const { powerPlan, coreIsolation, wirelessLan, ipv6, hyperv } = settings;
  const lm = hyperv?.liveMigration;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <GroupBox label="System">
        <PropertyList
          items={rows([
            { label: "Power plan", value: powerPlan?.name || powerPlan?.guid },
            {
              label: "Virtualization Based Security",
              value: onOff(coreIsolation?.vbs),
            },
            {
              label: "Memory integrity (HVCI)",
              value: onOff(coreIsolation?.hvci),
            },
            { label: "Page file", value: pageFileLabel(settings.pageFile) },
            {
              label: "Wireless LAN service",
              value: wirelessLan ? (wirelessLan.installed ? "Installed" : "Not installed") : null,
            },
            { label: "IPv6", value: ipv6Label(ipv6?.disabledComponents) },
          ])}
        />
      </GroupBox>
      <GroupBox label="Hyper-V">
        <PropertyList
          items={rows([
            { label: "NUMA spanning", value: onOff(hyperv?.numaSpanning) },
            {
              label: "Enhanced session mode",
              value: onOff(hyperv?.enhancedSessionMode),
            },
            { label: "Live migration", value: onOff(lm?.enabled) },
            {
              label: "Simultaneous live migrations",
              value: lm?.maxVmMigrations,
            },
            {
              label: "Simultaneous storage migrations",
              value: lm?.maxStorageMigrations,
            },
            {
              label: "Use any network for migration",
              value: yesNo(lm?.useAnyNetwork),
            },
            { label: "Authentication protocol", value: lm?.authentication },
            { label: "Performance option", value: lm?.performance },
          ])}
        />
      </GroupBox>
    </div>
  );
}
