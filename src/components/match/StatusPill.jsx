import { STATUS_LABEL, STATUS_STYLE } from "@/lib/xp";

export default function StatusPill({ status, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.12em] ${
        STATUS_STYLE[status] || "border-border bg-white/5 text-muted-foreground"
      } ${className}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {STATUS_LABEL[status] || status}
    </span>
  );
}
