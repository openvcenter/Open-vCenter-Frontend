import { Dropdown, GroupBox } from "~/components/win95";
import { bytes } from "../../format";
import { MetricChart } from "./MetricChart";
import type { MetricSeries } from "./MetricChart";

export const bytesPerSec = (v: number) => `${bytes(v)}/s`;
export const ms = (v: number) => `${v < 10 ? v.toFixed(1) : Math.round(v)} ms`;
const iops = (v: number) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));

export const ALL_DISKS = "*";

type Values = (number | null)[];

/** One disk's lines (or the totals, when there is one line). */
export interface DiskLine {
  /** legend prefix when several disks are drawn. */
  label: string;
  readBps: Values;
  writeBps: Values;
  readIops: Values;
  writeIops: Values;
  /** without `writeLatency` this is one combined latency line. */
  readLatency: Values;
  writeLatency?: Values;
}

// several disks: one colour per disk, read solid and write dashed
const DISK_COLORS = [5, 2, 1, 4, 3].map((n) => `var(--color-chart-${n})`);

function diskSeries(
  lines: DiskLine[],
  read: (d: DiskLine) => Values,
  write: (d: DiskLine) => Values | undefined,
  oneLabel = "Read",
): MetricSeries[] {
  const multi = lines.length > 1;
  return lines.flatMap((d, i) => {
    const w = write(d);
    const color = multi ? DISK_COLORS[i % DISK_COLORS.length] : "var(--color-chart-5)";
    const out: MetricSeries[] = [
      {
        label: multi ? `${d.label}${w ? " read" : ""}` : w ? "Read" : oneLabel,
        color,
        values: read(d),
      },
    ];
    if (w) {
      out.push({
        label: multi ? `${d.label} write` : "Write",
        color: multi ? color : "var(--color-chart-2)",
        values: w,
        dashed: multi,
      });
    }
    return out;
  });
}

/** Disk throughput, IOPS and latency: one line pair per disk under "all", or
 *  the disk picked in the selector. A single line pair draws read in chart
 *  colour 5 and write in 2. */
export function DiskMetricCharts({
  times,
  disks,
  disk,
  onDiskChange,
  allLabel,
  lines,
  latencyExtra = [],
}: {
  times: string[];
  /** selector options: value = disk key, label = what to show. */
  disks: { value: string; label: string }[];
  disk: string;
  onDiskChange: (disk: string) => void;
  allLabel: string;
  lines: DiskLine[];
  /** extra latency lines, e.g. the host's peak. */
  latencyExtra?: MetricSeries[];
}) {
  return (
    <GroupBox label="Disk">
      <div className="flex flex-col gap-3">
        {disks.length > 1 ? (
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
          series={diskSeries(lines, (d) => d.readBps, (d) => d.writeBps)}
        />
        <MetricChart
          title="Disk IOPS"
          times={times}
          format={iops}
          series={diskSeries(lines, (d) => d.readIops, (d) => d.writeIops)}
        />
        <MetricChart
          title="Disk latency"
          times={times}
          format={ms}
          series={[
            ...diskSeries(lines, (d) => d.readLatency, (d) => d.writeLatency, "Latency"),
            ...latencyExtra,
          ]}
        />
      </div>
    </GroupBox>
  );
}
