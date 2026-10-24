import { describe, expect, it } from "vitest";
import {
  DESTINATIONS,
  LANDING,
  NOTICES,
  forbiddenRedirectPath,
  highestDestination,
  isNoticeCode,
  parseDestination,
  resolveLanding,
  roleAtLeast,
  type Role,
} from "@/server/authorization/roles";

describe("parseDestination (untrusted ?as= value)", () => {
  it("accepts exactly the three allowed destinations", () => {
    expect(parseDestination("user")).toBe("user");
    expect(parseDestination("staff")).toBe("staff");
    expect(parseDestination("admin")).toBe("admin");
  });

  it("normalises case and whitespace", () => {
    expect(parseDestination(" ADMIN ")).toBe("admin");
    expect(parseDestination("Staff")).toBe("staff");
  });

  it.each([
    undefined,
    null,
    "",
    "superadmin",
    "admin,staff",
    "admin; DROP TABLE users",
    "//evil.example/admin",
    "https://evil.example",
    "javascript:alert(1)",
    "/admin",
    "../admin",
    "ADMIN\u0000",
    42,
    {},
  ])("falls back to user for %j", (value) => {
    expect(parseDestination(value)).toBe("user");
  });

  it("uses the first value when the parameter is repeated, still validating it", () => {
    expect(parseDestination(["admin", "user"])).toBe("admin");
    expect(parseDestination(["evil", "admin"])).toBe("user");
  });
});

describe("resolveLanding (role decides, request only asks)", () => {
  const roles: Role[] = ["USER", "STAFF", "ADMIN"];

  it("grants the requested dashboard when the role covers it", () => {
    expect(resolveLanding("ADMIN", "admin")).toEqual({ destination: "admin", path: "/admin" });
    expect(resolveLanding("ADMIN", "staff").path).toBe("/dashboard");
    expect(resolveLanding("ADMIN", "user").path).toBe("/inventory");
    expect(resolveLanding("STAFF", "staff").path).toBe("/dashboard");
    expect(resolveLanding("STAFF", "user").path).toBe("/inventory");
    expect(resolveLanding("USER", "user").path).toBe("/inventory");
  });

  it("never escalates: a lower role is sent to its own highest dashboard with a notice", () => {
    expect(resolveLanding("USER", "admin")).toEqual({ destination: "user", path: "/inventory", notice: "admin-denied" });
    expect(resolveLanding("USER", "staff")).toEqual({ destination: "user", path: "/inventory", notice: "staff-denied" });
    expect(resolveLanding("STAFF", "admin")).toEqual({ destination: "staff", path: "/dashboard", notice: "admin-denied" });
  });

  it("always lands on a fixed internal path, for every role x every tampered request", () => {
    const allowed = new Set(Object.values(LANDING));
    for (const role of roles) {
      for (const raw of [...DESTINATIONS, "root", "//evil.example", "https://evil.example", undefined]) {
        const decision = resolveLanding(role, parseDestination(raw));
        expect(allowed.has(decision.path)).toBe(true);
        expect(decision.path.startsWith("/")).toBe(true);
        expect(decision.path.startsWith("//")).toBe(false);
        // The landing page must be one the role may actually use (no redirect loop).
        expect(roleAtLeast(role, decision.destination === "admin" ? "ADMIN" : decision.destination === "staff" ? "STAFF" : "USER")).toBe(true);
      }
    }
  });
});

describe("page-guard redirects", () => {
  it("send a forbidden member to their own landing page, never to the page they were denied", () => {
    expect(forbiddenRedirectPath("USER", "STAFF")).toBe("/inventory?notice=staff-denied");
    expect(forbiddenRedirectPath("USER", "ADMIN")).toBe("/inventory?notice=admin-denied");
    expect(forbiddenRedirectPath("STAFF", "ADMIN")).toBe("/dashboard?notice=admin-denied");
  });

  it("only known notice codes are accepted for display", () => {
    expect(isNoticeCode("admin-denied")).toBe(true);
    expect(isNoticeCode("<script>")).toBe(false);
    expect(isNoticeCode("toString")).toBe(false);
    expect(isNoticeCode(null)).toBe(false);
    expect(Object.keys(NOTICES)).toHaveLength(2);
  });

  it("role ordering is USER < STAFF < ADMIN", () => {
    expect(roleAtLeast("ADMIN", "STAFF")).toBe(true);
    expect(roleAtLeast("STAFF", "ADMIN")).toBe(false);
    expect(roleAtLeast("USER", "STAFF")).toBe(false);
    expect(highestDestination("STAFF")).toBe("staff");
  });
});
