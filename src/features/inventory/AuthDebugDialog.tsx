import { useQuery } from "@tanstack/react-query";
import { Button, Dialog } from "~/components/win95";
import type { useAuth } from "~/auth";
import { meQuery } from "~/api/queries";

export function AuthDebugDialog({
  auth,
  onClose,
}: {
  auth: ReturnType<typeof useAuth>;
  onClose: () => void;
}) {
  // what the backend makes of the same session: groups + global privileges
  const me = useQuery(meQuery());
  return (
    <Dialog
      title="Auth Debug"
      onClose={onClose}
      footer={
        <Button onClick={onClose}>OK</Button>
      }
    >
      <div className="space-y-2 text-base">
        <p className="text-disabled-text">
          Client-side auth context only - never the raw OIDC tokens, which
          stay server-side (see ~/auth/token.server.ts).
        </p>
        <pre className="bevel-sunken max-h-[50vh] overflow-auto bg-surface p-2 font-mono text-xs">
          {JSON.stringify(
            {
              isAuthenticated: auth.isAuthenticated,
              isAdmin: auth.isAdmin,
              hasAnyGroup: auth.hasAnyGroup,
              user: auth.user,
              backend: me.data ?? (me.isError ? String(me.error) : "loading…"),
            },
            null,
            2,
          )}
        </pre>
      </div>
    </Dialog>
  );
}
