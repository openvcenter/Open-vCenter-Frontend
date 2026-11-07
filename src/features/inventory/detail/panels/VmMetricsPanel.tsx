import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { GroupBox } from "~/components/win95";
import type { Vm, VmMetricSample } from "~/api/types";
import { settingsQuery, vmMetricsQuery } from "~/api/queries";
import { bytes, intervalLabel, metricsKeptText, percent, relTime } from "../../format";
import { MetricChart } from "./MetricChart";
import { ALL_DISKS, DiskMetricCharts, bytesPerSec } from "./DiskMetricCharts";

type VmDisk = NonNullable<NonNullable<VmMetricSample["detail"]>["disks"]>[number];

const gauge = (
  samples: VmMetricSample[],
  pick: (s: VmMetricSample) => number | null | undefined,
): (number | null)[] => samples.map((s) => pick(s) ?? null);

const fileName = (path: string) => path.split(/[\\/]/).pop() || path;

export function VmMetricsPanel({ vm }: { vm: Vm }) {
  const q = useQuery(vmMetricsQuery(vm.id));
  const settings = useQuery(settingsQuery());
  const [disk, setDisk] = React.useState(ALL_DISKS);
  const samples = q.data ?? [];

  if (q.isLoading && !q.data) {
    return <p className="text-disabled-text">Loading metrics…</p>;
  }

  if (samples.length === 0) {
    const every = settings.data
      ? `every ${intervalLabel(settings.data.metricsIntervalSeconds)}`
      : "periodically";
    return (
      <GroupBox label="VM Metrics">
        <p>
          No samples yet. The host agent posts a sample {every} while the VM
          runs; {metricsKeptText(settings.data?.metricsRetentionSeconds)}.
        </p>
      </GroupBox>
    );
  }

  const first = samples[0];
  const latest = samples[samples.length - 1];
  const times = samples.map((s) => s.ts);

  const pressure = gauge(samples, (s) => s.memPressure);
  const hasPressure = pressure.some((v) => v != null);

  const diskPaths = [
    ...new Set(samples.flatMap((s) => (s.detail?.disks ?? []).map((d) => d.path))),
  ].sort();
  const selected = diskPaths.includes(disk) ? disk : ALL_DISKS;
  const one = (pick: (d: VmDisk) => number | null | undefined) =>
    gauge(samples, (s) => {
      const d = s.detail?.disks?.find((x) => x.path === selected);
      return d ? pick(d) : null;
    });
  const all = selected === ALL_DISKS;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-disabled-text">
        {samples.length} samples · {relTime(first.ts)} → {relTime(latest.ts)}
      </p>

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
        series={{
          readBps: all ? gauge(samples, (s) => s.diskReadBps) : one((d) => d.readBps),
          writeBps: all ? gauge(samples, (s) => s.diskWriteBps) : one((d) => d.writeBps),
          readIops: all ? gauge(samples, (s) => s.diskReadIops) : one((d) => d.readIops),
          writeIops: all ? gauge(samples, (s) => s.diskWriteIops) : one((d) => d.writeIops),
          latency: [
            {
              label: "Latency",
              color: "var(--color-chart-5)",
              values: all ? gauge(samples, (s) => s.diskLatencyMs) : one((d) => d.latencyMs),
            },
          ],
        }}
      />
    </div>
  );
}
