import { ApiError } from "~/api/client";

/** The inline error a failed request leaves in its dialog (it stays open). */
export function errorText(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : String(err);
}
