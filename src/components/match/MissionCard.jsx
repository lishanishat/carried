import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Clock,
  LifeBuoy,
  Loader2,
  Play,
  Send,
  Star,
  Zap,
} from "lucide-react";
import StatusPill from "@/components/match/StatusPill";
import ReviewPanel from "@/components/match/ReviewPanel";
import { DIFFICULTY_STYLE } from "@/lib/xp";

const BORDER = {
  confirmed: "border-neon/30",
  blocked: "border-danger/40",
  tag_in_requested: "border-warn/45",
  under_review: "border-warn/35",
  needs_revision: "border-warn/30",
};

const PRIMARY =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] bg-signal px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-colors hover:bg-signal/90 disabled:opacity-60";
const SECONDARY =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] border border-border px-3 text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors disabled:opacity-60";

export default function MissionCard({
  objective,
  prereqs = [],
  dependentsCount = 0,
  ownerName,
  roleTitle,
  me,
  players,
  onStart,
  onProof,
  onRescue,
  onTagIn,
  onTakeTagIn,
  onCancelTagIn,
  onDecide,
  busy,
  tagIn,
  resolveName,
}) {
  const status = objective.status;
  const isMine = objective.owner_id === me.id;
  const waiting = prereqs.filter((p) => p.status !== "confirmed");
  const active = !["confirmed", "under_review", "tag_in_requested"].includes(status);
  const handoffLine = (objective.previous_owner_ids || [])
    .map((id) => resolveName(id))
    .concat(resolveName(objective.owner_id));

  const prevStatus = useRef(status);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prevStatus.current !== status && status === "confirmed") {
      setFlash(true);
      prevStatus.current = status;
      const timer = setTimeout(() => setFlash(false), 1400);
      return () => clearTimeout(timer);
    }
    prevStatus.current = status;
  }, [status]);

  return (
    <article
      className={`panel relative overflow-hidden rounded-xl p-3.5 transition-colors ${
        BORDER[status] || ""
      } ${status === "confirmed" ? "opacity-95" : ""} ${flash ? "confirm-flash" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow truncate text-muted-foreground">
            {roleTitle || "Mission"} · {ownerName}
          </p>
          <h3 className="mt-1 text-[14.5px] font-semibold leading-snug text-foreground">
            {objective.title}
          </h3>
        </div>
        <StatusPill status={status} className="mt-0.5" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
        <span className={`num flex items-center gap-1 ${DIFFICULTY_STYLE[objective.difficulty] || ""}`}>
          <Zap className="h-2.5 w-2.5" />
          {objective.effort_points} XP
        </span>
        <span>{objective.difficulty}</span>
        {objective.deadline ? (
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {new Date(objective.deadline).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })}
          </span>
        ) : null}
        {dependentsCount > 0 && status !== "confirmed" ? (
          <span className="text-warn">blocks {dependentsCount}</span>
        ) : null}
      </div>

      {objective.description ? (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
          {objective.description}
        </p>
      ) : null}

      {objective.acceptance_criteria ? (
        <div className="mt-2.5 rounded-[8px] border border-border/80 bg-[hsl(240_9%_5%)] px-2.5 py-2">
          <p className="text-[9.5px] uppercase tracking-[0.14em] text-signal">Done means</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/85">
            {objective.acceptance_criteria}
          </p>
        </div>
      ) : null}

      {waiting.length ? (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-warn">
          <Clock className="mt-0.5 h-3 w-3 shrink-0" />
          Waiting on: {waiting.map((w) => w.title).join(", ")}
        </p>
      ) : prereqs.length ? (
        <p className="mt-2 text-[11px] text-neon">Dependencies clear.</p>
      ) : null}

      {handoffLine.length > 1 ? (
        <p className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          <ArrowLeftRight className="h-3 w-3 text-warn" />
          {handoffLine.join(" → ")}
        </p>
      ) : null}

      {status === "tag_in_requested" && tagIn ? (
        <div className="mt-2.5 rounded-[8px] border border-dashed border-warn/50 bg-warn/[0.05] p-2.5">
          <p className="text-[9.5px] uppercase tracking-[0.14em] text-warn">Handoff open</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/85">
            <span className="font-semibold text-foreground">{resolveName(tagIn.original_owner_id)}</span>{" "}
            is handing this mission over.
          </p>
          {tagIn.finished_work ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              <span className="uppercase tracking-[0.1em] text-foreground/70">Finished: </span>
              {tagIn.finished_work}
            </p>
          ) : null}
          {tagIn.remaining_work ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              <span className="uppercase tracking-[0.1em] text-foreground/70">Left: </span>
              {tagIn.remaining_work}
            </p>
          ) : null}
          {tagIn.reason ? (
            <p className="mt-1 text-[11px] italic text-muted-foreground">"{tagIn.reason}"</p>
          ) : null}
          {tagIn.original_owner_id === me.id ? (
            <button
              type="button"
              onClick={() => onCancelTagIn(tagIn.id)}
              disabled={busy}
              className={`${SECONDARY} mt-2 h-9 hover:border-danger/40 hover:text-danger`}
            >
              Cancel handoff
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onTakeTagIn(tagIn.id)}
              disabled={busy}
              className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] bg-warn px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(30_60%_8%)] transition-colors hover:bg-warn/90 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-3.5 w-3.5" />
              )}
              Take ownership
            </button>
          )}
        </div>
      ) : null}

      {status === "under_review" ? (
        <ReviewPanel
          objective={objective}
          players={players}
          me={me}
          onDecide={onDecide}
          busy={busy}
        />
      ) : null}

      {isMine && active ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5">
          {status === "available" || status === "needs_revision" ? (
            <button type="button" onClick={() => onStart(objective.id)} disabled={busy} className={PRIMARY}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Start mission
            </button>
          ) : null}

          {["in_progress", "needs_revision", "blocked"].includes(status) ? (
            <button type="button" onClick={() => onProof(objective)} className={PRIMARY}>
              <Send className="h-3.5 w-3.5" />
              Submit proof
            </button>
          ) : null}

          {["available", "in_progress", "needs_revision"].includes(status) ? (
            <>
              <button
                type="button"
                onClick={() => onRescue(objective)}
                className={`${SECONDARY} hover:border-warn/50 hover:text-warn`}
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                Need help
              </button>
              <button
                type="button"
                onClick={() => onTagIn(objective)}
                className={`${SECONDARY} hover:border-warn/50 hover:text-warn`}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Hand off
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {status === "confirmed" ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-neon">
          <Star className="h-3 w-3" />
          Confirmed — {objective.effort_points} XP banked once
        </p>
      ) : null}

      {!isMine && status !== "confirmed" && status !== "tag_in_requested" ? (
        <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
          Owned by {ownerName}
        </p>
      ) : null}
    </article>
  );
}
