import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import type { Role } from "@/server/authorization/roles";
import type { Executor } from "@/server/db/types";
import { closeTestPool, hasDatabase, sharedRollback, withRollback } from "../helpers/db";
import { createInventoryFixture, type Fixture } from "../helpers/inventory-fixture";

/**
 * The REAL route handlers end to end: guard -> validation -> SQL on the real
 * inventory tables -> JSON/CSV. Two things are substituted:
 *   - the session (a fixed ACTIVE member of the fixture workspace), and
 *   - the `db` export, pointed at the always-rolled-back test transaction.
 */
const holder = vi.hoisted(() => ({
  ex: null as unknown,
  state: { status: "unauthenticated" } as unknown,
}));

vi.mock("@/server/db", () => ({
  db: new Proxy(
    {},
    {
      get(_target, prop) {
        const ex = holder.ex as Record<string | symbol, unknown>;
        const value = ex[prop];
        return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(ex) : value;
      },
    },
  ),
}));
vi.mock("@/server/authorization/session", () => ({
  getAccessState: async () => holder.state,
}));

const BOM = "﻿";

describe.skipIf(!hasDatabase)("report & dashboard routes (real tables, rolled back)", () => {
  const shared = sharedRollback(createInventoryFixture);
  let f: Fixture;

  const as = (role: Role) => {
    holder.state = {
      status: "ok",
      access: {
        clerkUserId: "clerk_fx",
        userId: f.actor,
        workspaceId: f.ws,
        workspaceName: "Fixture",
        workspaceTimezone: "Asia/Kolkata",
        workspaceSettings: { defaultLowStockThreshold: 10 },
        role,
      },
    };
  };
  const get = async (path: string) => {
    const [stock, movements, summary, alerts] = await Promise.all([
      import("@/app/api/v1/reports/stock-summary/route"),
      import("@/app/api/v1/reports/movements/route"),
      import("@/app/api/v1/dashboard/summary/route"),
      import("@/app/api/v1/alerts/low-stock/route"),
    ]);
    const handler = path.startsWith("/reports/stock-summary")
      ? stock.GET
      : path.startsWith("/reports/movements")
        ? movements.GET
        : path.startsWith("/dashboard/summary")
          ? summary.GET
          : alerts.GET;
    return handler(new Request(`http://localhost/api/v1${path}`));
  };
  const csvLines = async (res: Response) => {
    const bytes = new Uint8Array(await res.arrayBuffer());
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
    expect(text.startsWith(BOM)).toBe(true);
    return text.slice(BOM.length).split("\r\n").filter((l) => l !== "");
  };

  beforeAll(async () => {
    const started = await shared.start();
    holder.ex = started.ex;
    f = started.fixture;
  }, 120_000);
  afterAll(async () => {
    await shared.finish();
    await closeTestPool();
  });

  describe("GET /reports/stock-summary", () => {
    it("ADMIN gets JSON with a total independent of the page size", async () => {
      as("ADMIN");
      const res = await get("/reports/stock-summary?limit=3&offset=0&sort=sku");
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      const body = (await res.json()) as { rows: unknown[]; total: number; limit: number };
      expect(body.rows).toHaveLength(3);
      expect(body.total).toBe(12);
      expect(body.limit).toBe(3);
    });

    it("CSV exports EVERY matching row even when limit/offset are supplied", async () => {
      as("ADMIN");
      const res = await get("/reports/stock-summary?format=csv&limit=1&offset=5");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/csv");
      expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="stock-summary-\d{4}-\d{2}-\d{2}\.csv"$/);
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      const lines = await csvLines(res);
      expect(lines[0]).toBe("SKU,Product,Category,Unit,Quantity on hand,Low-stock threshold,Status");
      expect(lines).toHaveLength(1 + 12); // header + all 12 active products, not 1
      expect(lines.join("\n")).not.toContain("Other workspace item"); // scoped to the caller's workspace
      expect(lines.join("\n")).not.toContain("Archived item"); // inactive excluded
    });

    it("CSV applies the same filters as the screen", async () => {
      as("ADMIN");
      const lines = await csvLines(await get("/reports/stock-summary?format=csv&stock=out"));
      expect(lines).toHaveLength(1 + 2);
      expect(lines.slice(1).every((l) => l.endsWith(",Out of stock"))).toBe(true);
    });

    it("escapes quotes/commas and neutralises spreadsheet formulas", async () => {
      as("ADMIN");
      const lines = await csvLines(await get("/reports/stock-summary?format=csv"));
      const text = lines.join("\n");
      // Formula payload: prefixed with ' and quoted (it contains quotes and a comma).
      expect(text).toContain(`SKU-FX,"'=HYPERLINK(""http://evil.example"",""click"")",`);
      // Ordinary quoting for commas and quotes.
      expect(text).toContain(`SKU-CM,"Salt, ""iodised""",`);
      // No cell anywhere begins with a formula character.
      for (const line of lines) expect(line).not.toMatch(/(^|,)[=+\-@]/);
      // Quantities stay plain numbers (not prefixed), including decimals.
      expect(text).toContain("SKU-DEC,Decimal low,,pcs,0.300000,0.300000,Low stock");
    });

    it("rejects invalid query values with the validation envelope", async () => {
      as("ADMIN");
      for (const q of ["stock=bogus", "sort=password", "limit=0", "limit=999999", "offset=-1", "categoryId=not-a-uuid", "format=xml"]) {
        const res = await get(`/reports/stock-summary?${q}`);
        expect(res.status, q).toBe(422);
        expect(((await res.json()) as { error: { code: string } }).error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("STAFF and USER are refused before any query runs", async () => {
      for (const role of ["STAFF", "USER"] as Role[]) {
        as(role);
        expect((await get("/reports/stock-summary")).status).toBe(403);
        expect((await get("/reports/stock-summary?format=csv")).status).toBe(403);
      }
    });
  });

  describe("GET /reports/movements", () => {
    it("CSV for a local-day range contains exactly the boundary-correct rows, with local and UTC times", async () => {
      as("ADMIN");
      const res = await get("/reports/movements?format=csv&from=2026-10-02&to=2026-10-02");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="movements-2026-10-02-to-2026-10-02.csv"');
      const lines = await csvLines(res);
      expect(lines[0]).toBe(
        "Date/time (Asia/Kolkata),Date/time (UTC),Type,Reason,SKU,Product,Unit,Quantity,Balance after,Supplier,Reference,Note,Recorded by",
      );
      expect(lines).toHaveLength(1 + 2);
      expect(lines[1]).toContain("2026-10-02 23:59,2026-10-02T18:29:59.000Z,Stock in,RETURN_IN");
      expect(lines[2]).toContain("2026-10-02 00:00,2026-10-01T18:30:00.000Z,Stock out,ISSUE");
      expect(lines.join("\n")).not.toContain("LEAK-5");
    });

    it("CSV without a range exports all of this workspace's movements regardless of limit", async () => {
      as("ADMIN");
      const lines = await csvLines(await get("/reports/movements?format=csv&limit=1"));
      expect(lines).toHaveLength(1 + 4);
    });

    it("JSON pages while reporting the full total", async () => {
      as("ADMIN");
      const body = (await (await get("/reports/movements?limit=1&offset=1")).json()) as {
        rows: { reference: string }[];
        total: number;
        timezone: string;
      };
      expect(body.rows.map((r) => r.reference)).toEqual(["RET-3"]);
      expect(body.total).toBe(4);
      expect(body.timezone).toBe("Asia/Kolkata");
    });

    it("validates dates and filters", async () => {
      as("ADMIN");
      for (const q of ["from=2026-10-03&to=2026-10-02", "from=2026-02-30", "from=yesterday", "to=2026-13-01", "type=SALE", "productId=nope"]) {
        const res = await get(`/reports/movements?${q}`);
        expect(res.status, q).toBe(422);
      }
    });

    it("STAFF and USER are refused", async () => {
      for (const role of ["STAFF", "USER"] as Role[]) {
        as(role);
        expect((await get("/reports/movements?format=csv")).status).toBe(403);
      }
    });
  });

  describe("dashboard summary and low-stock alerts (STAFF and above)", () => {
    it("STAFF sees real counts, alerts and recent movements for their workspace", async () => {
      as("STAFF");
      const summary = (await (await get("/dashboard/summary")).json()) as {
        summary: { activeProducts: number; lowStock: number; outOfStock: number; recentMovements: unknown[] };
      };
      expect(summary.summary).toMatchObject({ activeProducts: 12, lowStock: 5, outOfStock: 2 });
      expect(summary.summary.recentMovements).toHaveLength(4);

      const alerts = (await (await get("/alerts/low-stock?limit=100")).json()) as { alerts: { status: string }[]; total: number };
      expect(alerts.total).toBe(7);
      expect(alerts.alerts.filter((a) => a.status === "OUT_OF_STOCK")).toHaveLength(2);
      expect(alerts.alerts.filter((a) => a.status === "LOW_STOCK")).toHaveLength(5);
    });

    it("ADMIN can read them too; USER cannot", async () => {
      as("ADMIN");
      expect((await get("/dashboard/summary")).status).toBe(200);
      as("USER");
      expect((await get("/dashboard/summary")).status).toBe(403);
      expect((await get("/alerts/low-stock")).status).toBe(403);
    });

    it("rejects an out-of-range alert limit", async () => {
      as("STAFF");
      expect((await get("/alerts/low-stock?limit=0")).status).toBe(422);
      expect((await get("/alerts/low-stock?limit=100000")).status).toBe(422);
    });
  });

  it("returns 503 INVENTORY_UNAVAILABLE (no table names, no fabricated data) when tables are missing", async () => {
    const saved = holder.ex;
    try {
      await withRollback(async (tx: Executor) => {
        await tx.execute(sql`set local search_path to pg_temp`);
        holder.ex = tx;
        as("ADMIN");
        const res = await get("/reports/stock-summary");
        expect(res.status).toBe(503);
        const text = JSON.stringify(await res.json());
        expect(text).toContain("INVENTORY_UNAVAILABLE");
        expect(text).not.toMatch(/products|stock_movements|inventory_balances/);
      });
    } finally {
      holder.ex = saved;
    }
  });
});
