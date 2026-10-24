import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { ZodError } from "zod";
import { requireRole } from "@/server/authorization";
import { db } from "@/server/db";
import { auditLogs, categories, members, suppliers, users, workspaces } from "@/server/db/schema";
import { AppError, ensure } from "@/server/errors";
import { categoryInput, idInput, keyInput, memberInput, movementInput, productInput, productPatch, settingsInput, supplierInput } from "@/server/validation";
import { csv, minimumRole } from "@/modules/access/api-policy";
import { landings } from "@/modules/access/policy";
import { deleteCategory, productAction, saveCategory, saveProduct, saveSupplier, supplierAction } from "@/modules/products/service";
import { postStock } from "@/modules/inventory/service";
import { getProduct, listMovements, listProducts, summary } from "@/server/services/queries";
import { setMember, updateSettings } from "@/server/services/administration";

const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ path: string[] }> };
async function handler(request: Request, context: Context) {
  const requestId = crypto.randomUUID();
  try {
    const { path } = await context.params;
    const [resource, id, action] = path;
    ensure(path.length <= 3, "NOT_FOUND", "Endpoint not found.", 404);
    const method = request.method;
    const access = await requireRole(minimumRole(method, path));
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams);
    const read = method === "GET";
    if (!read) {
      const origin = request.headers.get("origin");
      ensure(!origin || origin === url.origin, "INVALID_ORIGIN", "This request must come from the application.", 403);
      ensure(Number(request.headers.get("content-length") ?? 0) <= 16384, "PAYLOAD_TOO_LARGE", "The request is too large.", 413);
    }
    const body = async () => {
      ensure(request.headers.get("content-type")?.includes("application/json"), "INVALID_CONTENT_TYPE", "Send JSON data.", 400);
      const text = await request.text();
      ensure(Buffer.byteLength(text) <= 16384, "PAYLOAD_TOO_LARGE", "The request is too large.", 413);
      try { return JSON.parse(text); } catch { throw new AppError("INVALID_JSON", "The request body is not valid JSON.", 400); }
    };
    let data: unknown;
    if (resource === "me" && read && !id) {
      const [user] = await db.select({ displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, access.userId));
      data = { ...access, ...user, landing: landings[access.role] };
    } else if (resource === "products") {
      if (!id && read) data = await listProducts(access, query);
      else if (!id && method === "POST") data = await saveProduct(access, productInput.parse(await body()));
      else if (id && !action) {
        idInput.parse(id);
        if (read) data = await getProduct(access, id);
        else if (method === "PATCH") data = await saveProduct(access, productPatch.parse(await body()), id);
        else if (method === "DELETE") data = await productAction(access, id, "delete");
      } else if (id && method === "POST" && (action === "deactivate" || action === "reactivate")) data = await productAction(access, idInput.parse(id), action);
    } else if (resource === "categories" && !action) {
      if (!id && read) data = await db.select().from(categories).where(eq(categories.workspaceId, access.workspaceId)).orderBy(asc(categories.name));
      else if (!id && method === "POST") data = await saveCategory(access, categoryInput.parse(await body()));
      else if (id && method === "PATCH") data = await saveCategory(access, categoryInput.parse(await body()), idInput.parse(id));
      else if (id && method === "DELETE") data = await deleteCategory(access, idInput.parse(id));
    } else if (resource === "suppliers") {
      if (read && !action) {
        const conditions = [eq(suppliers.workspaceId, access.workspaceId)];
        if (id) conditions.push(eq(suppliers.id, idInput.parse(id)));
        data = await db.select().from(suppliers).where(and(...conditions)).orderBy(asc(suppliers.name));
      } else if (!id && method === "POST") data = await saveSupplier(access, supplierInput.parse(await body()));
      else if (id && method === "PATCH" && !action) data = await saveSupplier(access, supplierInput.parse(await body()), idInput.parse(id));
      else if (id && method === "DELETE" && !action) data = await supplierAction(access, idInput.parse(id), "delete");
      else if (id && method === "POST" && (action === "deactivate" || action === "reactivate")) data = await supplierAction(access, idInput.parse(id), action);
    } else if (["stock-in", "stock-out"].includes(resource) && !id && method === "POST") {
      data = await postStock(access, movementInput.parse(await body()), resource === "stock-in" ? "STOCK_IN" : "STOCK_OUT", keyInput.parse(request.headers.get("idempotency-key")));
    } else if (resource === "stock-movements" && !id && read) data = await listMovements(access, query);
    else if (resource === "dashboard" && id === "summary" && !action && read) data = await summary(access);
    else if (resource === "alerts" && id === "low-stock" && !action && read) data = await listProducts(access, { ...query, stock: "low" });
    else if (resource === "reports" && ["stock-summary", "movements"].includes(id) && !action && read) {
      const { format, ...filters } = query;
      ensure(!format || format === "csv", "INVALID_FORMAT", "Supported export format: csv.", 400);
      if (format === "csv") {
        const rows: unknown[][] = [];
        let cursor: string | null = null;
        do {
          if (id === "stock-summary") {
            const page = await listProducts(access, { ...filters, limit: "200", ...(cursor ? { cursor } : {}) });
            rows.push(...page.items.map(row => [row.name, row.sku, row.category, row.unitLabel, row.quantity, row.stockStatus])); cursor = page.nextCursor;
          } else {
            const page = await listMovements(access, { ...filters, limit: "200", ...(cursor ? { cursor } : {}) });
            rows.push(...page.items.map(row => [row.createdAt, row.productName, row.sku, row.movementType, row.reasonCode, row.quantity, row.balanceAfter, row.actor, row.reference])); cursor = page.nextCursor;
          }
          ensure(rows.length <= 10000, "EXPORT_TOO_LARGE", "Narrow the filters to export up to 10,000 records.", 422);
        } while (cursor);
        return new Response(csv(id === "stock-summary" ? ["Product", "SKU", "Category", "Unit", "Quantity", "Status"] : ["Date", "Product", "SKU", "Type", "Reason", "Quantity", "Balance", "Actor", "Reference"], rows), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="ziggy-${id}.csv"` } });
      }
      data = id === "stock-summary" ? await listProducts(access, filters) : await listMovements(access, filters);
    } else if (resource === "members" && !action) {
      if (read && !id) data = await db.select({ userId: users.id, displayName: users.displayName, email: users.email, role: members.role, status: members.status }).from(members).innerJoin(users, eq(users.id, members.userId)).where(eq(members.workspaceId, access.workspaceId)).orderBy(asc(users.displayName));
      else if (read && id === "pending") data = await db.select({ userId: users.id, displayName: users.displayName, email: users.email }).from(users).leftJoin(members, eq(members.userId, users.id)).where(isNull(members.userId)).orderBy(asc(users.createdAt)).limit(100);
      else if (!id && method === "POST") data = await setMember(access, memberInput.parse(await body()));
      else if (id && method === "PATCH") data = await setMember(access, memberInput.parse({ ...(await body()), userId: idInput.parse(id) }));
    } else if (resource === "settings" && !id) {
      if (read) { const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, access.workspaceId)); data = workspace.settings; }
      else if (method === "PATCH") data = await updateSettings(access, settingsInput.parse(await body()));
    } else if (resource === "audit-logs" && !id && read) data = await db.select().from(auditLogs).where(eq(auditLogs.workspaceId, access.workspaceId)).orderBy(desc(auditLogs.createdAt)).limit(100);
    ensure(data !== undefined, "NOT_FOUND", "Endpoint not found.", 404);
    return Response.json({ data }, { headers, status: method === "POST" ? 201 : 200 });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: { code: "INVALID_INPUT", message: "Check the form fields and try again.", requestId, details: error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message })) } }, { status: 422, headers });
    if (error instanceof AppError) return Response.json({ error: { code: error.code, message: error.message, requestId } }, { status: error.status, headers });
    const cause = error as { code?: string; cause?: { code?: string } };
    const code = cause.code ?? cause.cause?.code;
    if (code === "23505") return Response.json({ error: { code: "DUPLICATE", message: "That SKU or category name already exists.", requestId } }, { status: 409, headers });
    if (code === "23503") return Response.json({ error: { code: "IN_USE", message: "This record is referenced by other records. Archive it instead.", requestId } }, { status: 409, headers });
    console.error("API request failed", { requestId, code: code ?? "UNKNOWN" });
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed. Try again or contact the administrator.", requestId } }, { status: 500, headers });
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
