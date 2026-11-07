import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { GroupBox } from "~/components/win95";
import type { Vm, VmMetricSample } from "~/api/types";
import { settingsQuery, vmMetricsQuery } from "~/api/queries";
import { bytes, intervalLabel, metricsKeptText, percent } from "../../format";
import { MetricChart } from "./MetricChart";
import { ALL_DISKS, DiskMetricCharts, bytesPerSec } from "./DiskMetricCharts";
import type { DiskLine } from "./DiskMetricCharts";
import { MetricZoomContext, MetricsRangeBar, useMetricsView, zoomed } from "./MetricsRangeBar";

type VmDisk = NonNullable<NonNullable<VmMetricSample["detail"]>["disks"]>[number];

const gauge = (
  samples: VmMetricSample[],
  pick: (s: VmMetricSample) => number | null | undefined,
): (number | null)[] => samples.map((s) => pick(s) ?? null);

const fileName = (path: string) => path.split(/[\\/]/).pop() || path;

export function VmMetricsPanel({ vm }: { vm: Vm }) {
  const settings = useQuery(settingsQuery());
  const view = useMetricsView(settings.data?.metricsRetentionSeconds);
  const q = useQuery(vmMetricsQuery(vm.id, view.seconds));
  const [disk, setDisk] = React.useState(ALL_DISKS);
  const samples = zoomed(q.data ?? [], view.zoom);

  if (q.isLoading && !q.data) {
    return <p className="text-disabled-text">Loading metrics…</p>;
  }

  if (samples.length === 0) {
    const every = settings.data
      ? `every ${intervalLabel(settings.data.metricsIntervalSeconds)}`
      : "periodically";
    return (
      <div className="flex flex-col gap-3">
        <MetricsRangeBar view={view} samples={samples} />
        <GroupBox label="VM Metrics">
          <p>
            No samples yet. The host agent posts a sample {every} while the VM
            runs; {metricsKeptText(settings.data?.metricsRetentionSeconds)}.
          </p>
        </GroupBox>
      </div>
    );
  }

  const times = samples.map((s) => s.ts);

  const pressure = gauge(samples, (s) => s.memPressure);
  const hasPressure = pressure.some((v) => v != null);

  const diskPaths = [
    ...new Set(samples.flatMap((s) => (s.detail?.disks ?? []).map((d) => d.path))),
  ].sort();
  const selected = diskPaths.includes(disk) ? disk : ALL_DISKS;
  const diskLine = (path: string): DiskLine => {
    const pick = (f: (d: VmDisk) => number | null | undefined) =>
      gauge(samples, (s) => {
        const d = s.detail?.disks?.find((x) => x.path === path);
        return d ? f(d) : null;
      });
    return {
      label: fileName(path),
      readBps: pick((d) => d.readBps),
      writeBps: pick((d) => d.writeBps),
      readIops: pick((d) => d.readIops),
      writeIops: pick((d) => d.writeIops),
      readLatency: pick((d) => d.latencyMs),
    };
  };
  const lines: DiskLine[] =
    selected !== ALL_DISKS
      ? [diskLine(selected)]
      : diskPaths.length > 1
        ? diskPaths.map(diskLine)
        : [
            {
              label: "All virtual disks",
              readBps: gauge(samples, (s) => s.diskReadBps),
              writeBps: gauge(samples, (s) => s.diskWriteBps),
              readIops: gauge(samples, (s) => s.diskReadIops),
              writeIops: gauge(samples, (s) => s.diskWriteIops),
              readLatency: gauge(samples, (s) => s.diskLatencyMs),
            },
          ];

  return (
    <MetricZoomContext.Provider value={view.zoomCtx}>
      <div className="flex flex-col gap-3">
        <MetricsRangeBar view={view} samples={samples} />

        <GroupBox label="Processor">
          <MetricChart
            title="CPU usage"
            times={times}
            yMax={100}
            format={(v) => percent(v)}
            series={[
              {
                label: "Average",
                color: "var(--color-chart-1)",
                values: gauge(samples, (s) => s.cpuPercent),
              },
              {
                label: "Peak",
                color: "var(--color-chart-1)",
                dashed: true,
                values: gauge(samples, (s) => s.cpuMaxPercent),
              },
            ]}
          />
        </GroupBox>

        <GroupBox label="Memory">
          <div className="flex flex-col gap-3">
            <MetricChart
              title="Memory in use"
              times={times}
              format={bytes}
              series={[
                {
                  label: "Used",
                  color: "var(--color-chart-2)",
                  values: gauge(samples, (s) => s.memBytes),
                },
              ]}
            />
            {hasPressure ? (
              <MetricChart
                title="Memory pressure"
                times={times}
                format={(v) => percent(v)}
                series={[
                  { label: "Pressure", color: "var(--color-chart-2)", values: pressure },
                ]}
              />
            ) : null}
          </div>
        </GroupBox>

        <GroupBox label="Network">
          <MetricChart
            title="Network throughput"
            times={times}
            format={bytesPerSec}
            series={[
              {
                label: "Receive",
                color: "var(--color-chart-3)",
                values: gauge(samples, (s) => s.netRxBps),
              },
              {
                label: "Send",
                color: "var(--color-chart-4)",
                values: gauge(samples, (s) => s.netTxBps),
              },
            ]}
          />
        </GroupBox>

        <DiskMetricCharts
          times={times}
          disks={diskPaths.map((p) => ({ value: p, label: fileName(p) }))}
          disk={selected}
          onDiskChange={setDisk}
          allLabel="All virtual disks"
          lines={lines}
        />
      </div>
    </MetricZoomContext.Provider>
  );
}
