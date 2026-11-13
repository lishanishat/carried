import { LifeBuoy, Loader2, UserCheck } from "lucide-react";

export default function RescueCard({
  rescue,
  objective,
  requesterName,
  helperName,
  mine,
  canVolunteer,
  onVolunteer,
  onResolve,
  busy,
}) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-warn/45 bg-warn/[0.07]">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-warn" />
      <div className="p-3.5 pl-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-warn">
            <LifeBuoy className="h-3.5 w-3.5" />
            Assistance requested
          </p>
          <span className="rounded-[6px] border border-warn/30 bg-warn/10 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em] text-warn">
            Owner keeps it
          </span>
        </div>

        <p className="mt-2 text-[14px] font-semibold leading-snug text-foreground">
          {objective?.title || "Mission"}
        </p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          {requesterName} is still the owner and stays on the hook.
        </p>

        <dl className="mt-2.5 space-y-1.5">
          <div className="flex gap-2 text-[12px] leading-relaxed">
            <dt className="w-[68px] shrink-0 pt-px text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
              Stuck on
            </dt>
            <dd className="min-w-0 text-foreground/85">{rescue.blocker}</dd>
          </div>
          <div className="flex gap-2 text-[12px] leading-relaxed">
            <dt className="w-[68px] shrink-0 pt-px text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
              Needs
            </dt>
            <dd className="min-w-0 text-foreground/85">{rescue.requested_help}</dd>
          </div>
        </dl>

        {rescue.relevant_links ? (
          <p className="mt-1.5 break-words text-[11px] text-signal">{rescue.relevant_links}</p>
        ) : null}

        {helperName ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-warn">
            <UserCheck className="h-3 w-3" />
            {helperName} is helping — assist XP lands when it's confirmed.
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canVolunteer ? (
            <button
              type="button"
              onClick={onVolunteer}
              disabled={busy}
              className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-[8px] bg-warn px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(30_60%_8%)] transition-colors hover:bg-warn/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LifeBuoy className="h-3.5 w-3.5" />}
              Help out
            </button>
          ) : null}
          {mine ? (
            <button
              type="button"
              onClick={onResolve}
              disabled={busy}
              className="inline-flex h-[38px] items-center justify-center rounded-[8px] border border-warn/40 px-3.5 text-[11px] uppercase tracking-[0.08em] text-warn transition-colors hover:bg-warn/10 disabled:opacity-60"
            >
              I'm unblocked
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
