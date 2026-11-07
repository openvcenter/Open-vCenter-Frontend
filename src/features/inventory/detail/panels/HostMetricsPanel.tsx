import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { GroupBox } from '~/components/win95'
import type { HostMetricSample } from '~/api/types'
import { hostMetricsQuery, settingsQuery } from '~/api/queries'
import { bytes, intervalLabel, metricsKeptText, percent, relTime } from '../../format'
import { MetricChart } from './MetricChart'
import { ALL_DISKS, DiskMetricCharts, bytesPerSec } from './DiskMetricCharts'

type HostDisk = NonNullable<NonNullable<HostMetricSample['detail']>['disks']>[number]

const gauge = (
  samples: HostMetricSample[],
  pick: (s: HostMetricSample) => number | null | undefined,
): (number | null)[] => samples.map((s) => pick(s) ?? null)

export function HostMetricsPanel({ hostId }: { hostId: string }) {
  const q = useQuery(hostMetricsQuery(hostId))
  const settings = useQuery(settingsQuery())
  const [disk, setDisk] = React.useState(ALL_DISKS)
  const samples = q.data ?? []

  if (q.isLoading && !q.data) {
    return <p className="text-disabled-text">Loading metrics…</p>
  }

  if (samples.length === 0) {
    const every = settings.data
      ? `every ${intervalLabel(settings.data.metricsIntervalSeconds)}`
      : 'periodically'
    return (
      <GroupBox label="Host Metrics">
        <p>
          No samples yet. The host agent posts a metrics sample {every};{' '}
          {metricsKeptText(settings.data?.metricsRetentionSeconds)}.
        </p>
      </GroupBox>
    )
  }

  const first = samples[0]
  const latest = samples[samples.length - 1]
  const times = samples.map((s) => s.ts)

  // Memory: prefer bytes-in-use from `detail`, fall back to the percent gauge.
  const memBytes = gauge(samples, (s) => s.detail?.memUsedBytes)
  const hasMemBytes = memBytes.some((v) => v != null)
  const memTotal = Math.max(0, ...samples.map((s) => s.detail?.memTotalBytes ?? 0))

  const diskNames = [
    ...new Set(samples.flatMap((s) => (s.detail?.disks ?? []).map((d) => d.name))),
  ].sort()
  const selected = diskNames.includes(disk) ? disk : ALL_DISKS
  const one = (pick: (d: HostDisk) => number | null | undefined) =>
    gauge(samples, (s) => {
      const d = s.detail?.disks?.find((x) => x.name === selected)
      return d ? pick(d) : null
    })
  const all = selected === ALL_DISKS

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
        disks={diskNames.map((n) => ({ value: n, label: n }))}
        disk={selected}
        onDiskChange={setDisk}
        allLabel="All disks"
        series={{
          readBps: all ? gauge(samples, (s) => s.diskReadBps) : one((d) => d.readBps),
          writeBps: all ? gauge(samples, (s) => s.diskWriteBps) : one((d) => d.writeBps),
          readIops: all ? gauge(samples, (s) => s.diskReadIops) : one((d) => d.readIops),
          writeIops: all ? gauge(samples, (s) => s.diskWriteIops) : one((d) => d.writeIops),
          latency: [
            {
              label: 'Read',
              color: 'var(--color-chart-5)',
              values: all
                ? gauge(samples, (s) => s.diskReadLatencyMs)
                : one((d) => d.readLatencyMs),
            },
            {
              label: 'Write',
              color: 'var(--color-chart-2)',
              values: all
                ? gauge(samples, (s) => s.diskWriteLatencyMs)
                : one((d) => d.writeLatencyMs),
            },
            ...(all
              ? [
                  {
                    label: 'Peak',
                    color: 'var(--color-chart-5)',
                    dashed: true,
                    values: gauge(samples, (s) => s.detail?.diskLatencyMaxMs),
                  },
                ]
              : []),
          ],
        }}
      />
    </div>
  )
}
