import { Activity, HeartPulse } from "lucide-react";

/* Completion — solid cyan, measured in banked effort points. */
export function ProgressStat({ health, className = "" }) {
  const pct = health?.completion ?? 0;
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <Activity className="h-3 w-3 text-signal" />
          Complete
        </p>
        <p className="num text-[12.5px] text-signal">{pct}%</p>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-signal transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="num mt-1 text-[10.5px] text-muted-foreground">
        {(health?.confirmed_points || 0).toLocaleString()} /{" "}
        {(health?.total_points || 0).toLocaleString()} points
      </p>
    </div>
  );
}

/* Team health — segmented, state-coloured, labelled in words. */
export default function HealthMeter({ health, className = "" }) {
  const score = health?.score ?? 0;
  const state =
    score >= 70
      ? { color: "hsl(var(--neon))", text: "text-neon", label: "Strong" }
      : score >= 40
        ? { color: "hsl(var(--warn))", text: "text-warn", label: "At risk" }
        : { color: "hsl(var(--danger))", text: "text-danger", label: "Critical" };
  const filled = Math.round((score / 100) * 10);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <HeartPulse className="h-3 w-3" />
          Team health
        </p>
        <p className="num text-[12.5px] text-foreground">
          {score}
          <span className="text-muted-foreground/60">/100</span>
        </p>
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-[2px] transition-colors duration-500"
            style={{ background: i < filled ? state.color : "hsl(240 7% 18%)" }}
          />
        ))}
      </div>
      <p className={`mt-1 text-[10.5px] font-medium ${state.text}`}>{state.label}</p>
    </div>
  );
}
