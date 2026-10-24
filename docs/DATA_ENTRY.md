# Adding real inventory

1. Open http://localhost:3000/sign-in and sign in with your approved Admin account. Choose Admin above the sign-in form to land on the Admin overview. Choosing a role does not grant it.
2. Add your **Categories** and **Suppliers** using the sidebar.
3. Open **Products → Add product**. Enter a unique SKU, product name, category, unit, low-stock threshold, and your actual current/opening quantity. Saving a positive opening quantity creates a stock movement in the same transaction as the product.
4. Open **Inventory** to check the saved quantity and stock status. Use search and filters to find products.
5. Use **Stock in** for purchases/returns and **Stock out** for issues/usage/damage/loss. Enter a positive quantity and a reason. Saving changes stock immediately. A stock-out larger than the available quantity is rejected.
6. Check **Movement history** and **Reports**. CSV exports contain actual database records.

Products with stock history must be archived instead of deleted. Quantities cannot be edited from the product form after creation; record stock movements instead.

New accounts get no inventory access automatically. An Admin can grant USER, STAFF or ADMIN from **Administration → Team & access**. At least one active Admin must remain.

## Supplying data for assisted entry

Provide product rows or a local CSV/Excel file path. Include:

```csv
name,sku,category,unit,current_quantity,low_stock_threshold,supplier
```

No sample rows or invented quantities have been inserted into the real workspace.

## Authentication

Google is enabled in the supplied Clerk development instance. The instance blocks email aliases containing `+` for Google OAuth; use a normal Google address for Google sign-in. Existing Clerk test accounts can use the enabled test-account sign-in methods. Real Google OAuth still requires signing in interactively in the browser.

The requested environment fallback is `/dashboard`; the sign-in component explicitly uses `/auth/continue` to resolve the user's actual database role safely.

## Database and checks

The supplied Neon database already contains schema, a workspace and an active Admin created outside this checkout. This implementation uses those existing tables without replacing them. Local initial migrations must not be applied to its public schema until the team's existing migration history is reconciled. The migration runner rejects unknown migration histories.

`npm test` runs unit and authorization tests. `npm run test:db` creates a disposable schema using the direct database connection, applies the local migrations there, runs stock tests, and drops only that schema. It leaves the real workspace untouched. An earlier integration run created a separate suspended test workspace (`2fbb8bb4-d9ef-495b-a144-a29ebe8567c1`); its immutable movement history was retained rather than bypassing database protection.
