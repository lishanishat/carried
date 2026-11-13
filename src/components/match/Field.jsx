export const inputClass =
  "w-full rounded-[10px] border border-border bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-signal/60 focus:outline-none focus:ring-2 focus:ring-signal/15";

export function Field({ label, hint, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-[11px] text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

export function ErrorLine({ children }) {
  if (!children) return null;
  return (
    <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
      {children}
    </p>
  );
}
