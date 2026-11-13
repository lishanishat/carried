import { AlertTriangle, Scale } from "lucide-react";

export default function EffortBalance({ roles, players }) {
  const totals = players.map((player) => {
    const effort = roles
      .filter((r) => r.owner_player_id === player.id)
      .reduce((sum, r) => sum + (r.estimated_effort || 0), 0);
    return { id: player.id, name: player.name, effort };
  });

  const unclaimed = roles
    .filter((r) => !r.owner_player_id)
    .reduce((sum, r) => sum + (r.estimated_effort || 0), 0);

  const claimed = totals.filter((t) => t.effort > 0);
  const max = claimed.reduce((m, t) => Math.max(m, t.effort), 0);
  const mean = claimed.length
    ? claimed.reduce((s, t) => s + t.effort, 0) / claimed.length
    : 0;
  const heavy = claimed.length > 1 && max > mean * 1.35;
  const heaviest = claimed.slice().sort((a, b) => b.effort - a.effort)[0];

  const scale = Math.max(1, ...totals.map((t) => t.effort), unclaimed);

  return (
    <div className="panel rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Scale className="h-3.5 w-3.5" />
          Effort balance
        </p>
        <span className="num text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {roles.reduce((s, r) => s + (r.estimated_effort || 0), 0)} pts total
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        {totals.map((t) => (
          <div key={t.id}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="truncate uppercase tracking-[0.12em] text-muted-foreground">
                {t.name}
              </span>
              <span className="num text-foreground/80">{t.effort}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round((t.effort / scale) * 100)}%`,
                  background:
                    heavy && t.id === heaviest?.id
                      ? "hsl(var(--warn))"
                      : "linear-gradient(90deg, hsl(var(--signal)/0.5), hsl(var(--signal)))",
                }}
              />
            </div>
          </div>
        ))}
        {unclaimed > 0 ? (
          <div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="uppercase tracking-[0.12em] text-muted-foreground/70">Unclaimed</span>
              <span className="num text-muted-foreground/70">{unclaimed}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-white/20"
                style={{ width: `${Math.round((unclaimed / scale) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {heavy ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-warn/40 bg-warn/10 px-2.5 py-2 text-[11px] leading-relaxed text-warn">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {heaviest.name} is carrying {Math.round((heaviest.effort / mean - 1) * 100)}% more effort
          than the squad average. Rebalance a mission before kickoff.
        </p>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Workload looks fair across the squad.
        </p>
      )}
    </div>
  );
}
