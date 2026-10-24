import { isValidTimeZone } from "./date-range";

/** Default workspace timezone (doc 03 `workspaces.timezone`, India first). */
export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Timezone used to interpret report dates. Reads `settings.timezone` when it is
 * a valid IANA name, otherwise falls back to DEFAULT_TIMEZONE. (The Drizzle
 * `workspaces` model has no `timezone` column yet; adding one is a schema
 * change for the identity owner — see TEAM_HANDOFF.md.)
 */
export function workspaceTimezone(settings: unknown): string {
  if (typeof settings === "object" && settings !== null) {
    const tz = (settings as Record<string, unknown>).timezone;
    if (typeof tz === "string" && isValidTimeZone(tz)) return tz;
  }
  return DEFAULT_TIMEZONE;
}
