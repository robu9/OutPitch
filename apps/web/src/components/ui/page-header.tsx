export function PageHeader({
  title,
  description,
  action,
  meta,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  meta?: string;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border bg-background-secondary px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {meta && (
          <div className="mb-1 text-xs text-muted-foreground">{meta}</div>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground text-pretty max-w-2xl">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
