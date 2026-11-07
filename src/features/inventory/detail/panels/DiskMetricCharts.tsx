import { Dropdown, GroupBox } from "~/components/win95";
import { bytes } from "../../format";
import { MetricChart } from "./MetricChart";
import type { MetricSeries } from "./MetricChart";

export const bytesPerSec = (v: number) => `${bytes(v)}/s`;
export const ms = (v: number) => `${v < 10 ? v.toFixed(1) : Math.round(v)} ms`;
const iops = (v: number) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));

export const ALL_DISKS = "*";

export interface DiskSeries {
  readBps: (number | null)[];
  writeBps: (number | null)[];
  readIops: (number | null)[];
  writeIops: (number | null)[];
  /** one or two latency lines (read / write, or a single combined one). */
  latency: MetricSeries[];
}

/** Disk throughput, IOPS and latency for all disks or the one picked in the
 *  selector. Read is chart colour 5, write 2. */
export function DiskMetricCharts({
  times,
  disks,
  disk,
  onDiskChange,
  allLabel,
  series,
}: {
  times: string[];
  /** selector options: value = disk key, label = what to show. */
  disks: { value: string; label: string }[];
  disk: string;
  onDiskChange: (disk: string) => void;
  allLabel: string;
  series: DiskSeries;
}) {
  return (
    <GroupBox label="Disk">
      <div className="flex flex-col gap-3">
        {disks.length > 0 ? (
          <Dropdown
            label="Show"
            className="w-[320px] max-w-full"
            value={disk}
            onChange={onDiskChange}
            options={[{ value: ALL_DISKS, label: allLabel }, ...disks]}
          />
        ) : null}
        <MetricChart
          title="Disk throughput"
          times={times}
          format={bytesPerSec}
          series={[
            { label: "Read", color: "var(--color-chart-5)", values: series.readBps },
            { label: "Write", color: "var(--color-chart-2)", values: series.writeBps },
          ]}
        />
        <MetricChart
          title="Disk IOPS"
          times={times}
          format={iops}
          series={[
            { label: "Read", color: "var(--color-chart-5)", values: series.readIops },
            { label: "Write", color: "var(--color-chart-2)", values: series.writeIops },
          ]}
        />
        <MetricChart title="Disk latency" times={times} format={ms} series={series.latency} />
      </div>
    </GroupBox>
  );
}
