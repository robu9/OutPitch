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
    <header className="flex flex-col gap-4 border-b border-[#1f1f1f] bg-[#0b0b0b] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {meta && (
          <div className="mb-1 flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#3b82f6]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" aria-hidden />
            {meta}
          </div>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[#888888] text-pretty max-w-2xl">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
