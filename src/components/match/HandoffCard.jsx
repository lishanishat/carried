import { ArrowLeftRight, ArrowRight, Loader2, X } from "lucide-react";

export default function HandoffCard({
  tagIn,
  objective,
  ownerName,
  eligibleNames = [],
  mine,
  onAccept,
  onCancel,
  busy,
}) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-dashed border-warn/50 bg-warn/[0.05]">
      <div className="p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-warn">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Handoff open
          </p>
          <span className="rounded-[6px] bg-warn/12 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em] text-warn">
            Ownership transfers
          </span>
        </div>

        <p className="mt-2 text-[14px] font-semibold leading-snug text-foreground">
          {objective?.title || "Mission"}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="text-foreground/85">{ownerName}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground/85">{mine ? "whoever takes it" : "you"}</span>
        </p>

        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          <div className="rounded-[8px] border border-border/80 bg-[hsl(240_9%_5%)] px-2.5 py-2">
            <p className="text-[9.5px] uppercase tracking-[0.12em] text-neon">Finished</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/85">
              {tagIn.finished_work || "Nothing handed over yet"}
            </p>
          </div>
          <div className="rounded-[8px] border border-border/80 bg-[hsl(240_9%_5%)] px-2.5 py-2">
            <p className="text-[9.5px] uppercase tracking-[0.12em] text-warn">Remaining</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/85">
              {tagIn.remaining_work || "Everything left to do"}
            </p>
          </div>
        </div>

        {tagIn.resource_links ? (
          <p className="mt-1.5 break-words text-[11px] text-signal">{tagIn.resource_links}</p>
        ) : null}
        {tagIn.reason ? (
          <p className="mt-1.5 text-[11px] italic text-muted-foreground">"{tagIn.reason}"</p>
        ) : null}

        <p className="mt-2 text-[10.5px] text-muted-foreground">
          Can accept: <span className="text-foreground/80">{eligibleNames.join(", ") || "no one yet"}</span>
        </p>

        <div className="mt-2.5">
          {mine ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-[8px] border border-border px-3.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" />
              Cancel handoff
            </button>
          ) : (
            <button
              type="button"
              onClick={onAccept}
              disabled={busy}
              className="inline-flex h-[38px] w-full items-center justify-center gap-1.5 rounded-[8px] bg-warn px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(30_60%_8%)] transition-colors hover:bg-warn/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
              Take ownership
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
