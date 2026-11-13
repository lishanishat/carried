import { useState } from "react";
import {
  Bot,
  Check,
  ExternalLink,
  Loader2,
  Paperclip,
  UserCheck,
  X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { timeAgo } from "@/components/match/Countdown";

const DECISION_STYLE = {
  CONFIRMED: { text: "text-neon", border: "border-neon/40", bg: "bg-neon/[0.07]" },
  NEEDS_REVISION: { text: "text-warn", border: "border-warn/40", bg: "bg-warn/[0.07]" },
  INSUFFICIENT_EVIDENCE: { text: "text-danger", border: "border-danger/40", bg: "bg-danger/[0.07]" },
};

const HUMAN_LABEL = {
  CONFIRMED: { text: "text-neon", label: "Approved" },
  NEEDS_REVISION: { text: "text-warn", label: "Changes requested" },
  INSUFFICIENT_EVIDENCE: { text: "text-danger", label: "Not enough evidence" },
};

function AttachmentLink({ fileUri }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setBusy(true);
    setError("");
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri });
      if (signed_url) window.open(signed_url, "_blank", "noopener");
      else setError("That attachment can't be opened right now.");
    } catch {
      setError("That attachment can't be opened right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-signal hover:underline"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
        Attachment
      </button>
      {error ? <span className="text-[10px] text-danger">{error}</span> : null}
    </span>
  );
}

export default function ReviewPanel({ objective, players, me, onDecide, busy }) {
  const evidence = objective.evidence?.[0];
  const [note, setNote] = useState("");
  if (!evidence) return null;

  const aiReview = (evidence.reviews || []).filter((r) => r.is_ai).slice(-1)[0];
  const humanReview = (evidence.reviews || []).filter((r) => !r.is_ai).slice(-1)[0];
  const submitter = players.find((p) => p.id === evidence.submitted_by);
  const canDecide =
    objective.status === "under_review" &&
    (players.length > 1 ? evidence.submitted_by !== me.id : true);
  const style = DECISION_STYLE[aiReview?.recommendation] || DECISION_STYLE.NEEDS_REVISION;
  const human = humanReview ? HUMAN_LABEL[humanReview.recommendation] : null;

  return (
    <div className="mt-2.5 space-y-2.5 rounded-[8px] border border-border/80 bg-[hsl(240_9%_5%)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Proof from {submitter?.name || "player"} ·{" "}
          {timeAgo(evidence.submitted_at || evidence.created_date)}
        </p>
        <span
          className={`rounded-[6px] px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.1em] ${
            objective.status === "under_review"
              ? "bg-warn/12 text-warn"
              : "bg-neon/12 text-neon"
          }`}
        >
          {objective.status === "under_review" ? "Awaiting review" : "Reviewed"}
        </span>
      </div>

      {evidence.text ? (
        <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground/85">
          {evidence.text}
        </p>
      ) : (
        <p className="text-[12.5px] italic text-muted-foreground">No written explanation supplied.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {evidence.resource_reference ? (
          <a
            href={evidence.resource_reference}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-signal hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Link
          </a>
        ) : null}
        {evidence.file_uri ? <AttachmentLink fileUri={evidence.file_uri} /> : null}
      </div>

      {aiReview ? (
        <div className={`rounded-[8px] border ${style.border} ${style.bg} p-2.5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.12em] ${style.text}`}>
              <Bot className="h-3 w-3" />
              AI referee suggestion
            </p>
            <span className="num text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
              {aiReview.recommendation.replace(/_/g, " ").toLowerCase()}
              {typeof aiReview.confidence === "number"
                ? ` · ${Math.round(aiReview.confidence * 100)}%`
                : ""}
            </span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/90">
            {aiReview.explanation}
          </p>
          {aiReview.requirements_missing?.length ? (
            <ul className="mt-1.5 space-y-1">
              {aiReview.requirements_missing.map((req) => (
                <li key={req} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <X className="mt-0.5 h-3 w-3 shrink-0 text-danger" />
                  {req}
                </li>
              ))}
            </ul>
          ) : null}
          {aiReview.requirements_met?.length ? (
            <ul className="mt-1.5 space-y-1">
              {aiReview.requirements_met.map((req) => (
                <li key={req} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-neon" />
                  {req}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/70">
            AI recommendation only — it can't open links.
          </p>
        </div>
      ) : null}

      {humanReview && human ? (
        <div className="flex items-start gap-1.5 rounded-[8px] border border-border/70 px-2.5 py-2">
          <UserCheck className={`mt-0.5 h-3 w-3 shrink-0 ${human.text}`} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="uppercase tracking-[0.1em] text-foreground/70">Teammate decision · </span>
            <span className={human.text}>{human.label}</span>
            {humanReview.reviewer_name ? ` by ${humanReview.reviewer_name}` : ""}
            {humanReview.explanation ? ` — ${humanReview.explanation}` : ""}
          </p>
        </div>
      ) : null}

      {canDecide ? (
        <div className="space-y-2 border-t border-border/70 pt-2.5">
          <p className="text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
            Your call as a teammate
          </p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={400}
            placeholder="Optional note for the squad"
            className="w-full rounded-[8px] border border-border bg-secondary/50 px-2.5 py-2 text-[12px] text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-signal/60 focus:outline-none focus:ring-2 focus:ring-signal/15"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onDecide(evidence.id, "CONFIRMED", note)}
              disabled={busy}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-neon px-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-colors hover:bg-neon/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve
            </button>
            <button
              type="button"
              onClick={() => onDecide(evidence.id, "NEEDS_REVISION", note)}
              disabled={busy}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-warn/50 bg-warn/10 px-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-warn transition-colors hover:bg-warn/20 disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" />
              Request changes
            </button>
          </div>
        </div>
      ) : null}

      {!canDecide && objective.status === "under_review" && evidence.submitted_by === me.id ? (
        <p className="text-[11px] text-muted-foreground">
          Waiting for a teammate to review. You can't approve your own work.
        </p>
      ) : null}
    </div>
  );
}
