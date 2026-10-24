/**
 * Date-range filtering for movement reports.
 *
 * `from` and `to` are calendar dates (YYYY-MM-DD) interpreted in the WORKSPACE
 * timezone, never the server's or browser's. Both ends are inclusive of the
 * whole local day:
 *
 *   occurred_at >= start of `from` (local midnight)
 *   occurred_at <  start of the day AFTER `to` (local midnight)
 *
 * The SQL conversion happens in PostgreSQL (`AT TIME ZONE`), so DST and offsets
 * are handled by the database. This module only validates inputs.
 */
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1970 || y > 2999) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export type RangeCheck = { ok: true } | { ok: false; message: string };

export function checkDateRange(from: string | undefined, to: string | undefined): RangeCheck {
  if (from !== undefined && !isValidDate(from)) return { ok: false, message: "`from` must be a valid date (YYYY-MM-DD)." };
  if (to !== undefined && !isValidDate(to)) return { ok: false, message: "`to` must be a valid date (YYYY-MM-DD)." };
  if (from !== undefined && to !== undefined && from > to) {
    return { ok: false, message: "`from` must not be after `to`." };
  }
  return { ok: true };
}
