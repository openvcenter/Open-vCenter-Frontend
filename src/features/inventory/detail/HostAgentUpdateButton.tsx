import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/win95";
import { useGlobalCan } from "../rbac/privileges";
import { agentBinariesQuery } from "~/api/queries";
import { updateHostAgent } from "~/api/endpoints/hosts";
import { ApiError } from "~/api/client";
import type { Host } from "~/api/types";
import { confirm } from "../confirm";
import { activeTasks } from "../actions/activeTasks";
import { statusMessage } from "../actions/statusMessage";

/**
 * Header action on a connected host: offers to upgrade the agent to the active
 * build when the host is running an older version. Needs `host.manage`
 * globally (the agent-binary catalog is a global resource).
 */
export function HostAgentUpdateButton({ host }: { host: Host }) {
  const canManage = useGlobalCan("host.manage");
  const qc = useQueryClient();
  const binaries = useQuery({ ...agentBinariesQuery(), enabled: canManage });

  const target = (binaries.data ?? []).find(
    (b) => b.isActive && b.hypervisor === host.hypervisor,
  );

  const m = useMutation({
    mutationFn: () => updateHostAgent(host.id),
    onSuccess: ({ task }) => {
      activeTasks.add(task.id);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      statusMessage.set(`Agent upgrade queued for ${host.name}`);
    },
    onError: (err) =>
      statusMessage.set(err instanceof ApiError ? err.message : String(err)),
  });

  if (!canManage || !host.agent.connected || !target) return null;
  if (host.agent.version === target.version) return null;

  const run = async () => {
    const ok = await confirm({
      title: "Update Agent",
      message: `Upgrade the agent on "${host.name}" from ${host.agent.version ?? "-"} to ${target.version}? The agent restarts itself in drain mode.`,
      confirmLabel: "Update",
    });
    if (ok) m.mutate();
  };

  return (
    <Button className="min-w-0 px-2" disabled={m.isPending} onClick={run}>
      Update Agent → {target.version}
    </Button>
  );
}
