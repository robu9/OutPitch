export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-[#3b82f6] ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-8 bg-[#050505]" aria-busy="true" aria-label="Loading workstation">
      <div className="flex items-center gap-3 border-b border-[#1f1f1f] pb-6">
        <div className="skeleton h-6 w-48 rounded" />
        <div className="skeleton h-5 w-24 rounded font-mono" />
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full rounded border border-[#1f1f1f]" />
        ))}
      </div>
    </div>
  );
}
