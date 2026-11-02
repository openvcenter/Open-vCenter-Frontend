import { Button, Dialog } from "~/components/win95";
import { organizeDialog } from "../organize/dialogStore";
import { PermissionsPanel } from "./PermissionsPanel";

/** Administration ▸ Global Permissions: permissions on the inventory root. */
export function GlobalPermissionsDialog() {
  return (
    <Dialog
      title="Global Permissions"
      onClose={organizeDialog.close}
      width={760}
      footer={<Button onClick={() => organizeDialog.close()}>Close</Button>}
    >
      <PermissionsPanel scopeType="global" scopeId={null} />
    </Dialog>
  );
}
