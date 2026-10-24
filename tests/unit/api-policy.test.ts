import { expect, it } from "vitest";
import { minimumRole, csv } from "../../src/modules/access/api-policy";
it("requires Admin for catalogue edits and Staff for stock operations", () => {
  expect(minimumRole("GET", ["products"])).toBe("USER");
  expect(minimumRole("POST", ["products"])).toBe("ADMIN");
  expect(minimumRole("POST", ["stock-in"])).toBe("STAFF");
  expect(minimumRole("GET", ["suppliers"])).toBe("STAFF");
  expect(minimumRole("GET", ["reports", "stock-summary"])).toBe("ADMIN");
  expect(minimumRole("PATCH", ["members", crypto.randomUUID()])).toBe("ADMIN");
});
it("quotes CSV fields and neutralizes spreadsheet formula cells", () => {
  expect(csv(["name", "sku"], [["=1+1", 'a,"b']])).toBe('"name","sku"\r\n"\'=1+1","a,""b"');
});
