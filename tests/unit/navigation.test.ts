import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adminNav, appNav } from "../../src/components/layout/nav-config";
import { canAccess, landings, viewRole } from "../../src/modules/access/policy";

const exists = (href: string) => [`src/app/(app)${href}/page.tsx`, `src/app${href}/page.tsx`].some(p => existsSync(p));
const items = [...appNav, ...adminNav].flatMap(section => section.items);

describe("active navigation", () => {
  it("never links to a route that does not exist", () => {
    const broken = items.filter(item => !exists(item.href)).map(item => item.href);
    expect(broken).toEqual([]);
  });
  it("has no obsolete storefront or deferred links (the USER demo cart/checkout/my-orders routes are intentional)", () => {
    for (const item of items) expect(item.href).not.toMatch(/^\/(shop|orders|transfers|intelligence|select-workspace|sales)|\/admin\/(locations|units|workspace|data)/);
  });
  it("sends every role to a landing page its own role may open", () => {
    for (const [role, href] of Object.entries(landings)) {
      const item = items.find(i => i.href === href);
      expect(item, href).toBeDefined();
      expect(canAccess(role as keyof typeof landings, item!.minimum)).toBe(true);
    }
  });
  it("hides every admin link from STAFF and USER, and staff links from USER", () => {
    for (const item of items.filter(i => i.minimum === "ADMIN")) {
      expect(canAccess("STAFF", item.minimum)).toBe(false);
      expect(canAccess("USER", item.minimum)).toBe(false);
    }
    for (const item of items.filter(i => i.minimum === "STAFF")) expect(canAccess("USER", item.minimum)).toBe(false);
  });
  it("lets an admin browse as a customer but never exceeds the real role", () => {
    expect(viewRole("ADMIN", "USER")).toBe("USER");
    expect(viewRole("ADMIN", undefined)).toBe("ADMIN");
    expect(viewRole("USER", "ADMIN")).toBe("USER");
    expect(viewRole("STAFF", "junk")).toBe("STAFF");
  });
});
