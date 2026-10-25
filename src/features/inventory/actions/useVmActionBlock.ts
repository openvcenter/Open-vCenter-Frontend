import { useQuery } from "@tanstack/react-query";
import { hostQuery } from "~/api/queries";
import type { Vm } from "~/api/types";
import { TRANSITIONAL_VM_STATES } from "~/api/types";
import { taskLabel } from "../tasks/taskLabels";

/**
 * The one rule for "can an agent-backed VM action run right now?": not while the
 * VM is locked by a running task, not while its host agent is offline (the
 * backend answers 409), and not mid-transition. `reason` is the short,
 * user-facing explanation, or null when actions are open.
 */
export function useVmActionBlock(vm: Pick<Vm, "hostId" | "state" | "lock">) {
  const host = useQuery({ ...hostQuery(vm.hostId), enabled: !!vm.hostId });
  const locked = !!vm.lock;
  const hostOffline = host.isSuccess && !host.data.online;
  const transitional = TRANSITIONAL_VM_STATES.has(vm.state);
  const reason = vm.lock
    ? `${taskLabel(vm.lock.kind)} in progress`
    : hostOffline
      ? "host agent offline"
      : transitional
        ? `VM is ${vm.state.toLowerCase()}`
        : null;
  return { host, locked, hostOffline, transitional, reason, blocked: !!reason };
}
