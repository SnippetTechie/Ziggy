/**
 * Wireframe primitives. These render the *structure* of each screen with
 * DESIGN.md tokens and clearly-labelled placeholders. They are replaced by
 * real data-bound components as each phase of doc 07 is implemented.
 */

export function PageHeader({
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  description?: string;
  primaryAction?: string;
  secondaryAction?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-heading-xl text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-body-md text-mute">{description}</p>}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex shrink-0 gap-2">
          {secondaryAction && <Button variant="secondary">{secondaryAction}</Button>}
          {primaryAction && <Button>{primaryAction}</Button>}
        </div>
      )}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
}) {
  const styles = {
    primary: "bg-primary text-on-primary active:bg-primary-pressed",
    secondary: "bg-secondary-bg text-ink active:bg-secondary-pressed",
    tertiary: "bg-transparent text-ink hover:bg-surface-card",
  }[variant];
  return (
    <button
      type="button"
      className={`h-10 rounded-md px-3.5 text-body-sm font-bold whitespace-nowrap ${styles}`}
    >
      {children}
    </button>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-hairline bg-canvas p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-heading-md text-ink">{title}</h2>}
          {action && (
            <span className="text-body-sm font-semibold text-ink-soft underline-offset-2 hover:underline">
              {action}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** Dashed box describing what will live in this slot. */
export function Placeholder({
  label,
  hint,
  height = "h-40",
}: {
  label: string;
  hint?: string;
  height?: string;
}) {
  return (
    <div
      className={`flex ${height} flex-col items-center justify-center rounded-md border-2 border-dashed border-stone bg-surface-card px-4 text-center`}
    >
      <p className="text-body-sm font-bold text-charcoal">{label}</p>
      {hint && <p className="mt-1 text-caption text-mute">{hint}</p>}
    </div>
  );
}

export function StatTile({
  label,
  value = "—",
  hint,
  tone = "neutral",
}: {
  label: string;
  value?: string;
  hint?: string;
  tone?: "neutral" | "warning" | "danger" | "success";
}) {
  // Status is always carried by text, never colour alone (doc 04 §3.2).
  const toneBadge = {
    neutral: null,
    warning: "Needs attention",
    danger: "Action required",
    success: "Healthy",
  }[tone];
  return (
    <div className="rounded-md border border-hairline bg-canvas p-5">
      <p className="text-body-sm font-semibold text-mute">{label}</p>
      <p className="mt-2 text-heading-xl text-ink">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {toneBadge && <StatusPill tone={tone}>{toneBadge}</StatusPill>}
        {hint && <span className="text-caption text-mute">{hint}</span>}
      </div>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "warning" | "danger" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    neutral: "bg-secondary-bg text-ink",
    warning: "bg-warning-pale text-warning-deep",
    danger: "bg-error-pale text-error",
    success: "bg-success-pale text-success-deep",
  }[tone];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-caption font-bold ${styles}`}>
      {children}
    </span>
  );
}

export function FilterChips({ chips, active = 0 }: { chips: string[]; active?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <span
          key={chip}
          className={
            "rounded-full px-4 py-2 text-body-sm font-bold " +
            (i === active ? "bg-ink text-on-dark" : "bg-surface-card text-ink")
          }
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

/** Table skeleton: real column headers, placeholder rows. */
export function WireTable({
  columns,
  rows = 6,
  numericFrom,
}: {
  columns: string[];
  rows?: number;
  /** Index from which columns are right-aligned (quantities, money). */
  numericFrom?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-hairline bg-canvas">
      <table className="w-full min-w-[640px] text-left text-body-sm">
        <thead className="border-b border-hairline bg-surface-soft">
          <tr>
            {columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={`px-4 py-3 font-bold text-ink ${
                  numericFrom !== undefined && i >= numericFrom ? "text-right" : ""
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-hairline-soft last:border-0">
              {columns.map((c, i) => (
                <td key={c} className="px-4 py-3.5">
                  <span
                    className={`block h-3 rounded-full bg-secondary-bg ${
                      numericFrom !== undefined && i >= numericFrom ? "ml-auto w-12" : i === 0 ? "w-40" : "w-24"
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Standard list page: header, filters, table. */
export function ListPage({
  title,
  description,
  primaryAction,
  secondaryAction,
  chips,
  columns,
  numericFrom,
  note,
}: {
  title: string;
  description: string;
  primaryAction?: string;
  secondaryAction?: string;
  chips?: string[];
  columns: string[];
  numericFrom?: number;
  note?: string;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
      />
      {chips && (
        <div className="mb-4">
          <FilterChips chips={chips} />
        </div>
      )}
      <WireTable columns={columns} numericFrom={numericFrom} />
      {note && <p className="mt-3 text-caption text-mute">{note}</p>}
    </>
  );
}
