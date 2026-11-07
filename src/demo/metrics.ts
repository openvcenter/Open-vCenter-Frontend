import type { HostMetricSample, VmMetricSample } from "~/api/types";
import type { DemoHost, DemoState, DemoVm } from "./model";
import { hash32, noise } from "./random";

/**
 * Fake quick metrics. Nothing is stored: every sample is a pure function of
 * (entity, minute), so polls return a stable, sliding window - the retention
 * and collection interval from Application Preferences (`state.settings`). The
 * values follow the simulated inventory - a VM only burns CPU while it runs,
 * and a host's load is the sum of its running VMs.
 */

const STEP_MS = 60_000;
const MAX_SAMPLES = 720;
const MB = 1024 ** 2;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const iso = (minute: number) => new Date(minute * STEP_MS).toISOString();

/** Whether the VM was powered on at time `t` (ms). */
function runningAt(vm: DemoVm, t: number): boolean {
  if (vm.runningSince == null || t < vm.runningSince) return false;
  if (vm.state === "Running" || vm.state === "Restarting" || vm.state === "Stopping")
    return true;
  return vm.stoppedAt != null && t < vm.stoppedAt;
}

/** CPU % the VM uses at time `t` - a slow wave plus jitter around its baseline. */
export function vmCpuAt(vm: DemoVm, t: number): number {
  if (!runningAt(vm, t) || vm.state === "Paused") return 0;
  const m = Math.floor(t / STEP_MS);
  const phase = (hash32(vm.id) % 628) / 100;
  const wave = Math.sin(m / 7 + phase) * vm.cpuBase * 0.35;
  const jitter = (noise(vm.id, m) - 0.5) * vm.cpuBase * 0.5;
  return clamp(vm.cpuBase + wave + jitter, 0.5, 99);
}

/** Guest memory in use at time `t` (bytes). */
export function vmMemAt(vm: DemoVm, t: number): number {
  if (!runningAt(vm, t)) return 0;
  const m = Math.floor(t / STEP_MS);
  const ratio = 0.55 + noise(`${vm.id}:mem`, Math.floor(m / 10)) * 0.25;
  return Math.round(vm.memory.assignedBytes * ratio);
}

/** Sample instants (ms) for a read of the last `seconds` (default: the whole
 *  retention window), one per collection interval - coarser on long windows so
 *  a read never returns more than `MAX_SAMPLES`. */
function sampleTimes(state: DemoState, now: number, seconds?: string): number[] {
  const { metricsRetentionSeconds, metricsIntervalSeconds } = state.settings;
  const asked = Number(seconds);
  const span =
    Math.min(asked >= 60 ? asked : metricsRetentionSeconds, metricsRetentionSeconds) * 1000;
  const step = Math.max(
    metricsIntervalSeconds * 1000,
    Math.ceil(span / MAX_SAMPLES / STEP_MS) * STEP_MS,
  );
  const last = Math.floor(now / step) * step;
  const count = Math.max(1, Math.floor(span / step));
  return Array.from({ length: count }, (_, i) => last - (count - 1 - i) * step);
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Per-second disk / network rates around `base` bytes/s at minute `m`. */
function io(key: string, m: number, base: number) {
  const readBps = base * (0.3 + noise(`${key}:dr`, m) * 1.4);
  const writeBps = base * 0.6 * (0.3 + noise(`${key}:dw`, m) * 1.4);
  return {
    readBps: Math.round(readBps),
    writeBps: Math.round(writeBps),
    readIops: Math.round(readBps / (64 * 1024)),
    writeIops: Math.round(writeBps / (32 * 1024)),
  };
}

export function vmMetrics(
  state: DemoState,
  vm: DemoVm,
  now: number,
  seconds?: string,
): VmMetricSample[] {
  const base = (1 + (hash32(vm.id) % 20)) * MB;
  const disks = vm.disks.length ? vm.disks : [];
  return sampleTimes(state, now, seconds)
    .filter((t) => runningAt(vm, t))
    .map((t) => {
      const m = Math.floor(t / STEP_MS);
      const cpu = vmCpuAt(vm, t);
      const perDisk = disks.map((d, i) => ({
        path: d.path,
        ...io(`${vm.id}:${i}`, m, base / disks.length),
        latencyMs: round1(0.5 + noise(`${vm.id}:lat${i}`, m) * 4),
        queueLength: round1(noise(`${vm.id}:q${i}`, m) * 2),
      }));
      const sum = (k: "readBps" | "writeBps" | "readIops" | "writeIops") =>
        perDisk.reduce((n, d) => n + d[k], 0);
      const iops = sum("readIops") + sum("writeIops");
      return {
        ts: iso(m),
        cpuPercent: round1(cpu),
        cpuMaxPercent: round1(clamp(cpu * (1.2 + noise(`${vm.id}:cpumax`, m) * 0.6), cpu, 100)),
        memBytes: vmMemAt(vm, t),
        memPressure: vm.memory.dynamic
          ? Math.round(45 + noise(`${vm.id}:press`, m) * 50)
          : null,
        diskReadBps: sum("readBps"),
        diskWriteBps: sum("writeBps"),
        diskReadIops: sum("readIops"),
        diskWriteIops: sum("writeIops"),
        diskLatencyMs: iops
          ? round1(
              perDisk.reduce((n, d) => n + d.latencyMs * (d.readIops + d.writeIops), 0) / iops,
            )
          : null,
        netRxBps: Math.round(base * 0.4 * (0.3 + noise(`${vm.id}:rx`, m) * 1.4)),
        netTxBps: Math.round(base * 0.25 * (0.3 + noise(`${vm.id}:tx`, m) * 1.4)),
        detail: { disks: perDisk },
      };
    });
}

export function hostMetrics(
  state: DemoState,
  host: DemoHost,
  now: number,
  seconds?: string,
): HostMetricSample[] {
  const hw = host.hardware;
  if (!hw || now < host.connectAt) return [];
  const vms = state.vms.filter((v) => v.hostId === host.id);
  const logical = hw.cpu.logical || 1;
  const total = hw.memoryBytes;
  const nics = hw.network.filter((n) => n.connected);
  const csvs = state.clusters.find((c) => c.id === host.clusterId)?.csvs ?? [];
  const volumes = [...host.localVolumes, ...csvs].map((v) => ({
    name: v.path.replace(/\\$/, ""),
    label: v.label,
  }));

  return sampleTimes(state, now, seconds).map((t) => {
    const m = Math.floor(t / STEP_MS);
    if (host.offlineFrom != null && host.offlineUntil != null && t >= host.offlineFrom && t < host.offlineUntil) {
      return {
        ts: iso(m),
        cpuPercent: null,
        cpuMaxPercent: null,
        memPercent: null,
        diskReadBps: null,
        diskWriteBps: null,
        diskReadIops: null,
        diskWriteIops: null,
        diskReadLatencyMs: null,
        diskWriteLatencyMs: null,
        netRxBps: null,
        netTxBps: null,
        detail: null,
      };
    }
    const running = vms.filter((v) => runningAt(v, t));
    const cpu = clamp(
      3 +
        noise(`${host.id}:cpu`, m) * 4 +
        (running.reduce((n, v) => n + vmCpuAt(v, t) * v.vcpu, 0) / logical) * 2,
      1,
      99,
    );
    const used =
      total * host.memBase + running.reduce((n, v) => n + v.memory.assignedBytes, 0);
    const memUsed = Math.min(total * 0.97, used);
    const spike = noise(`${host.id}:lat-spike`, m) > 0.93 ? 12 : 0;
    const latency = 0.8 + noise(`${host.id}:lat`, m) * 3 + spike;
    const wave = 1 + Math.sin(m / 9 + (hash32(host.id) % 100)) * 0.4;
    const rx = running.length * 0.9 * MB * wave * (0.6 + noise(`${host.id}:rx`, m));
    const tx = running.length * 0.6 * MB * wave * (0.6 + noise(`${host.id}:tx`, m));
    const diskBase = (2 + running.length * 3) * MB * wave;
    const disks = volumes.map((v, i) => ({
      ...v,
      ...io(`${host.id}:${i}`, m, diskBase / volumes.length),
      readLatencyMs: round1(latency * (0.7 + noise(`${host.id}:r${i}`, m) * 0.6)),
      writeLatencyMs: round1(latency * (0.9 + noise(`${host.id}:w${i}`, m) * 0.8)),
      queueLength: round1(noise(`${host.id}:q${i}`, m) * 3),
      busyPercent: Math.round(5 + noise(`${host.id}:b${i}`, m) * 40),
    }));
    const sum = (k: "readBps" | "writeBps" | "readIops" | "writeIops") =>
      disks.reduce((n, d) => n + d[k], 0);
    const avg = (k: "readLatencyMs" | "writeLatencyMs") =>
      disks.length ? round1(disks.reduce((n, d) => n + d[k], 0) / disks.length) : null;
    return {
      ts: iso(m),
      cpuPercent: round1(cpu),
      cpuMaxPercent: round1(clamp(cpu * (1.15 + noise(`${host.id}:cpumax`, m) * 0.5), cpu, 100)),
      memPercent: round1((memUsed / total) * 100),
      diskReadBps: sum("readBps"),
      diskWriteBps: sum("writeBps"),
      diskReadIops: sum("readIops"),
      diskWriteIops: sum("writeIops"),
      diskReadLatencyMs: avg("readLatencyMs"),
      diskWriteLatencyMs: avg("writeLatencyMs"),
      netRxBps: Math.round(rx),
      netTxBps: Math.round(tx),
      detail: {
        memUsedBytes: Math.round(memUsed),
        memTotalBytes: total,
        diskLatencyMaxMs: disks.length
          ? Math.max(...disks.map((d) => Math.max(d.readLatencyMs, d.writeLatencyMs)))
          : null,
        disks,
        net: nics.map((n, i) => ({
          name: n.name,
          rxBps: Math.round((rx / nics.length) * (0.8 + noise(`${host.id}:nrx${i}`, m) * 0.4)),
          txBps: Math.round((tx / nics.length) * (0.8 + noise(`${host.id}:ntx${i}`, m) * 0.4)),
        })),
      },
    };
  });
}
