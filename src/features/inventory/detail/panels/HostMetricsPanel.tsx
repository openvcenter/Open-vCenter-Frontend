import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { GroupBox } from '~/components/win95'
import type { HostMetricSample } from '~/api/types'
import { hostMetricsQuery, settingsQuery } from '~/api/queries'
import { bytes, intervalLabel, metricsKeptText, percent } from '../../format'
import { MetricChart } from './MetricChart'
import { ALL_DISKS, DiskMetricCharts, bytesPerSec } from './DiskMetricCharts'
import type { DiskLine } from './DiskMetricCharts'
import { MetricZoomContext, MetricsRangeBar, useMetricsView, zoomed } from './MetricsRangeBar'

type HostDisk = NonNullable<NonNullable<HostMetricSample['detail']>['disks']>[number]

const gauge = (
  samples: HostMetricSample[],
  pick: (s: HostMetricSample) => number | null | undefined,
): (number | null)[] => samples.map((s) => pick(s) ?? null)

export function HostMetricsPanel({ hostId }: { hostId: string }) {
  const settings = useQuery(settingsQuery())
  const view = useMetricsView(settings.data?.metricsRetentionSeconds)
  const q = useQuery(hostMetricsQuery(hostId, view.seconds))
  const [disk, setDisk] = React.useState(ALL_DISKS)
  const samples = zoomed(q.data ?? [], view.zoom)

  if (q.isLoading && !q.data) {
    return <p className="text-disabled-text">Loading metrics…</p>
  }

  if (samples.length === 0) {
    const every = settings.data
      ? `every ${intervalLabel(settings.data.metricsIntervalSeconds)}`
      : 'periodically'
    return (
      <div className="flex flex-col gap-3">
        <MetricsRangeBar view={view} samples={samples} />
        <GroupBox label="Host Metrics">
          <p>
            No samples yet. The host agent posts a metrics sample {every};{' '}
            {metricsKeptText(settings.data?.metricsRetentionSeconds)}.
          </p>
        </GroupBox>
      </div>
    )
  }

  const times = samples.map((s) => s.ts)

  // Memory: prefer bytes-in-use from `detail`, fall back to the percent gauge.
  const memBytes = gauge(samples, (s) => s.detail?.memUsedBytes)
  const hasMemBytes = memBytes.some((v) => v != null)
  const memTotal = Math.max(0, ...samples.map((s) => s.detail?.memTotalBytes ?? 0))

  const diskNames = [
    ...new Set(samples.flatMap((s) => (s.detail?.disks ?? []).map((d) => d.name))),
  ].sort()
  // "C: (SYSTEM)", "C:\ClusterStorage\Volume1 (CSV-Prod)": the latest label wins
  const labels = new Map<string, string>()
  for (const s of samples) {
    for (const d of s.detail?.disks ?? []) if (d.label) labels.set(d.name, d.label)
  }
  const diskTitle = (name: string) => {
    const label = labels.get(name)
    return label ? `${name} (${label})` : name
  }
  const selected = diskNames.includes(disk) ? disk : ALL_DISKS
  const diskLine = (name: string): DiskLine => {
    const pick = (f: (d: HostDisk) => number | null | undefined) =>
      gauge(samples, (s) => {
        const d = s.detail?.disks?.find((x) => x.name === name)
        return d ? f(d) : null
      })
    return {
      label: diskTitle(name),
      readBps: pick((d) => d.readBps),
      writeBps: pick((d) => d.writeBps),
      readIops: pick((d) => d.readIops),
      writeIops: pick((d) => d.writeIops),
      readLatency: pick((d) => d.readLatencyMs),
      writeLatency: pick((d) => d.writeLatencyMs),
    }
  }
  // one disk (or none in detail): the totals, with the window's peak latency
  const totals = diskNames.length <= 1
  const lines: DiskLine[] =
    selected !== ALL_DISKS
      ? [diskLine(selected)]
      : totals
        ? [
            {
              label: 'All disks',
              readBps: gauge(samples, (s) => s.diskReadBps),
              writeBps: gauge(samples, (s) => s.diskWriteBps),
              readIops: gauge(samples, (s) => s.diskReadIops),
              writeIops: gauge(samples, (s) => s.diskWriteIops),
              readLatency: gauge(samples, (s) => s.diskReadLatencyMs),
              writeLatency: gauge(samples, (s) => s.diskWriteLatencyMs),
            },
          ]
        : diskNames.map(diskLine)

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
                label: 'Average',
                color: 'var(--color-chart-1)',
                values: gauge(samples, (s) => s.cpuPercent),
              },
              {
                label: 'Peak',
                color: 'var(--color-chart-1)',
                dashed: true,
                values: gauge(samples, (s) => s.cpuMaxPercent),
              },
            ]}
          />
        </GroupBox>

        <GroupBox label="Memory">
          <MetricChart
            title="Memory in use"
            times={times}
            yMax={hasMemBytes ? memTotal || undefined : 100}
            format={hasMemBytes ? bytes : (v) => percent(v)}
            series={[
              {
                label: 'Used',
                color: 'var(--color-chart-2)',
                values: hasMemBytes ? memBytes : gauge(samples, (s) => s.memPercent),
              },
            ]}
          />
        </GroupBox>

        <GroupBox label="Network">
          <MetricChart
            title="Network throughput"
            times={times}
            format={bytesPerSec}
            series={[
              {
                label: 'Receive',
                color: 'var(--color-chart-3)',
                values: gauge(samples, (s) => s.netRxBps),
              },
              {
                label: 'Send',
                color: 'var(--color-chart-4)',
                values: gauge(samples, (s) => s.netTxBps),
              },
            ]}
          />
        </GroupBox>

        <DiskMetricCharts
          times={times}
          disks={diskNames.map((n) => ({ value: n, label: diskTitle(n) }))}
          disk={selected}
          onDiskChange={setDisk}
          allLabel="All disks"
          lines={lines}
          latencyExtra={
            selected === ALL_DISKS && totals
              ? [
                  {
                    label: 'Peak',
                    color: 'var(--color-chart-5)',
                    dashed: true,
                    values: gauge(samples, (s) => s.detail?.diskLatencyMaxMs),
                  },
                ]
              : []
          }
        />
      </div>
    </MetricZoomContext.Provider>
  )
}
