import * as React from "react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from "ag-grid-community";
import type {
  ColDef,
  GridApi,
  IRowNode,
  SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import {
  Button,
  ClientOnly,
  Dropdown,
  Icon,
  TextField,
} from "~/components/win95";
import type { DropdownOption } from "~/components/win95";
import type { Vm, VmState } from "~/api/types";
import { bytes, duration } from "../format";
import { VmStateLabel } from "../tree/nodeIcons";
import { useInventorySelection } from "../selection";
import { confirm } from "../confirm";
import { useVmBatchPowerAction } from "../actions/useVmBatchPowerAction";
import type { VmBatchAction } from "../actions/useVmBatchPowerAction";
import { POWER_ACTIONS } from "../actions/powerActions";

ModuleRegistry.registerModules([AllCommunityModule]);

// A flat list view; colours come from the active theme's CSS tokens (see
// app.css / themes), so switching themes needs no grid re-render. The bevel
// comes from the wrapper div.
const gridTheme = themeQuartz.withParams({
  fontFamily: "inherit",
  fontSize: 12,
  headerFontSize: 12,
  // same density as the win95 `Table` (Th ≈ 24 px, Td ≈ 22 px); Quartz's
  // defaults (≈ 42 px rows) read as a different app inside the detail pane
  rowHeight: 22,
  headerHeight: 24,
  cellHorizontalPadding: 8,
  iconSize: 12,
  borderRadius: 0,
  wrapperBorderRadius: 0,
  browserColorScheme: "inherit",
  foregroundColor: "var(--grid-fg)",
  backgroundColor: "var(--color-window)",
  headerBackgroundColor: "var(--grid-header-bg)",
  oddRowBackgroundColor: "var(--color-window)",
  rowHoverColor: "var(--grid-row-hover)",
  selectedRowBackgroundColor: "var(--color-selection)",
  borderColor: "var(--grid-border)",
});

// Every column has an explicit colId: ag-grid otherwise numbers the
// valueGetter-only columns itself, and when the column set is rebuilt (the
// selection column changes with every batch lock) the generated ids drift and
// cells land under the wrong header.
const columns: ColDef<Vm>[] = [
  { colId: "name", field: "name", headerName: "Name", flex: 2, minWidth: 160 },
  {
    colId: "state",
    field: "state",
    headerName: "State",
    width: 120,
    minWidth: 120,
    cellRenderer: (p: { value?: VmState }) =>
      p.value ? <VmStateLabel state={p.value} /> : null,
  },
  { colId: "vcpu", field: "vcpu", headerName: "vCPU", width: 80, minWidth: 80 },
  {
    colId: "memory",
    headerName: "Memory",
    width: 110,
    minWidth: 110,
    valueGetter: (p) => p.data?.memory.assignedBytes ?? 0,
    valueFormatter: (p) => bytes(p.value),
  },
  {
    colId: "uptime",
    headerName: "Uptime",
    width: 110,
    minWidth: 110,
    valueGetter: (p) => p.data?.uptimeSec ?? null,
    valueFormatter: (p) => duration(p.value),
  },
  {
    colId: "snapshot",
    headerName: "Snapshot",
    width: 100,
    minWidth: 100,
    valueGetter: (p) => ((p.data?.snapshots.length ?? 0) > 0 ? "Yes" : "No"),
  },
  {
    colId: "ip",
    headerName: "IP address",
    flex: 1,
    minWidth: 130,
    valueGetter: (p) =>
      p.data?.nics.flatMap((n) => n.ipAddresses).join(", ") || "-",
  },
];

// Sorting stays; the per-column header filters are gone (see the search box and
// the filter dropdowns in the toolbar above the grid).
const defaultColDef: ColDef = {
  sortable: true,
  filter: false,
  resizable: true,
};

const STATE_FILTER_OPTIONS: DropdownOption[] = [
  { value: "", label: "All states" },
  { value: "Running", label: "Running" },
  { value: "Off", label: "Off" },
  { value: "Paused", label: "Paused" },
  { value: "Saved", label: "Saved" },
  // VMs stranded on a host whose agent went away
  { value: "Unknown", label: "Unknown" },
];

const SNAPSHOT_FILTER_OPTIONS: DropdownOption[] = [
  { value: "", label: "Any snapshot" },
  { value: "yes", label: "Has snapshot" },
  { value: "no", label: "No snapshot" },
];

// Batch buttons reuse the single-VM power definitions so the label, icon and
// confirmation text match the header buttons exactly.
const BATCH_ACTIONS = {
  Off: ["start"],
  Running: ["shutdown", "stop"],
} as const satisfies Record<"Off" | "Running", VmBatchAction[]>;

const powerDef = (id: VmBatchAction) => POWER_ACTIONS.find((a) => a.id === id)!;

/** Batch power actions only make sense for VMs that are fully on or fully off. */
const BATCHABLE_STATES: ReadonlySet<VmState> = new Set<VmState>([
  "Running",
  "Off",
]);

/** `hostNames` adds a Host column - for lists that span hosts (a cluster folder). */
export function VmGrid({
  vms,
  hostNames,
}: {
  vms: Vm[];
  hostNames?: ReadonlyMap<string, string>;
}) {
  const { select } = useInventorySelection();
  const batch = useVmBatchPowerAction();

  const [search, setSearch] = React.useState("");
  const [stateFilter, setStateFilter] = React.useState("");
  const [snapshotFilter, setSnapshotFilter] = React.useState("");
  const [selectedVms, setSelectedVms] = React.useState<Vm[]>([]);
  const gridApiRef = React.useRef<GridApi<Vm> | null>(null);

  // The host list polls, so `hostNames` is a new Map every few seconds. Read it
  // through a ref and refresh the cells, so the column set itself only changes
  // when the Host column appears or goes away.
  const hostNamesRef = React.useRef(hostNames);
  hostNamesRef.current = hostNames;
  const showHost = !!hostNames;
  React.useEffect(() => {
    gridApiRef.current?.refreshCells({ columns: ["host"] });
  }, [hostNames]);

  const columnDefs = React.useMemo<ColDef<Vm>[]>(
    () =>
      showHost
        ? [
            columns[0],
            columns[1],
            {
              colId: "host",
              headerName: "Host",
              width: 140,
              minWidth: 140,
              valueGetter: (p) =>
                p.data
                  ? (hostNamesRef.current?.get(p.data.hostId) ?? p.data.hostId)
                  : "",
            },
            ...columns.slice(2),
          ]
        : columns,
    [showHost],
  );

  // A batch can only target VMs that share one power state; the first selected
  // row locks the rest until the selection is cleared.
  const lockedState =
    selectedVms[0]?.state === "Running"
      ? "Running"
      : selectedVms[0]?.state === "Off"
        ? "Off"
        : null;

  const filtered = React.useMemo(
    () =>
      vms.filter((v) => {
        if (stateFilter && v.state !== stateFilter) return false;
        const hasSnapshot = v.snapshots.length > 0;
        if (snapshotFilter === "yes" && !hasSnapshot) return false;
        if (snapshotFilter === "no" && hasSnapshot) return false;
        return true;
      }),
    [vms, stateFilter, snapshotFilter],
  );

  // Recreated whenever the lock changes so ag-grid re-evaluates which checkboxes
  // are still enabled.
  const rowSelection = React.useMemo(
    () =>
      ({
        mode: "multiRow",
        checkboxes: true,
        headerCheckbox: false,
        enableClickSelection: false,
        isRowSelectable: (node: IRowNode<Vm>) => {
          const s = node.data?.state;
          if (!s || !BATCHABLE_STATES.has(s)) return false;
          return !lockedState || s === lockedState;
        },
      }) as const,
    [lockedState],
  );

  const onSelectionChanged = (e: SelectionChangedEvent<Vm>) => {
    setSelectedVms(e.api.getSelectedRows());
  };

  const clearSelection = () => {
    gridApiRef.current?.deselectAll();
    setSelectedVms([]);
  };

  const runBatch = async (action: VmBatchAction) => {
    const def = powerDef(action);
    const n = selectedVms.length;
    const ok = await confirm({
      title: `${def.label} - ${n} VM${n === 1 ? "" : "s"}`,
      confirmLabel: def.label,
      danger: action === "stop",
      message: (
        <div className="space-y-1">
          <p>
            {def.label} the following {n} VM{n === 1 ? "" : "s"}?
          </p>
          <ul className="bevel-sunken max-h-40 overflow-auto bg-window p-1">
            {selectedVms.map((v) => (
              <li key={v.id}>{v.name}</li>
            ))}
          </ul>
          {action === "stop" && (
            <p className="font-bold text-danger">
              Unsaved data in the guests will be lost.
            </p>
          )}
        </div>
      ),
    });
    if (!ok) return;
    batch.mutate({ vms: selectedVms, action }, { onSettled: clearSelection });
  };

  return (
    <div className="flex h-full min-h-[240px] flex-col gap-[3px]">
      <div className="flex flex-wrap items-center gap-2">
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search VMs…"
          className="w-52"
          aria-label="Search VMs"
        />
        <Dropdown
          value={stateFilter}
          onChange={setStateFilter}
          options={STATE_FILTER_OPTIONS}
          className="w-32"
        />
        <Dropdown
          value={snapshotFilter}
          onChange={setSnapshotFilter}
          options={SNAPSHOT_FILTER_OPTIONS}
          className="w-36"
        />
        <div className="flex-1" />
        {selectedVms.length > 0 &&
          lockedState &&
          BATCH_ACTIONS[lockedState].map((id) => {
            const def = powerDef(id);
            return (
              <Button
                key={id}
                className="min-w-0 px-2"
                disabled={batch.isPending}
                onClick={() => runBatch(id)}
              >
                <Icon icon={def.icon} size={14} className={def.color} />
                {def.label} ({selectedVms.length})
              </Button>
            );
          })}
      </div>

      <div className="bevel-sunken h-full min-h-[200px] bg-window p-[2px]">
        <ClientOnly
          fallback={<div className="p-2 text-disabled-text">Loading grid…</div>}
        >
          <AgGridReact<Vm>
            theme={gridTheme}
            rowData={filtered}
            columnDefs={columnDefs}
            overlayNoRowsTemplate="No virtual machines"
            defaultColDef={defaultColDef}
            quickFilterText={search}
            rowSelection={rowSelection}
            onGridReady={(e) => {
              gridApiRef.current = e.api;
            }}
            onSelectionChanged={onSelectionChanged}
            getRowId={(p) => p.data.id}
            onRowClicked={(e) =>
              e.data && select({ kind: "vm", id: e.data.id })
            }
            onRowDoubleClicked={(e) =>
              e.data && select({ kind: "vm", id: e.data.id }, "summary")
            }
          />
        </ClientOnly>
      </div>
    </div>
  );
}
