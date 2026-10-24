import type { Role } from "./policy";
export function minimumRole(method: string, path: string[]): Role {
  const [resource] = path;
  if (resource === "me") return "USER";
  if (["products", "categories"].includes(resource) && method === "GET") return "USER";
  if (resource === "suppliers" && method === "GET") return "STAFF";
  if (["stock-in", "stock-out", "stock-movements", "dashboard", "alerts"].includes(resource)) return "STAFF";
  return "ADMIN";
}
export function csv(headers: string[], rows: unknown[][]) {
  const escape = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return [headers, ...rows].map(row => row.map(escape).join(",")).join("\r\n");
}
