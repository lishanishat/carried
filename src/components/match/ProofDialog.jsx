import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Paperclip, Send, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { submitProof } from "@/lib/mission-fns";
import { Field, inputClass, ErrorLine } from "@/components/match/Field";

const RESULT = {
  CONFIRMED: { label: "Referee says: looks done", tone: "text-neon", border: "border-neon/40", bg: "bg-neon/10" },
  NEEDS_REVISION: { label: "Referee says: needs revision", tone: "text-warn", border: "border-warn/40", bg: "bg-warn/10" },
  INSUFFICIENT_EVIDENCE: {
    label: "Referee says: not enough evidence",
    tone: "text-danger",
    border: "border-danger/40",
    bg: "bg-danger/10",
  },
};

export default function ProofDialog({ code, token, objective, onClose, onDone }) {
  const showProof = useServerFn(submitProof);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    setText("");
    setUrl("");
    setFile(null);
    setError("");
    setResult(null);
  }, [objective?.id]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!text.trim() && !url.trim()) {
      setError("Write a short explanation or add a link so the referee has something to check.");
      return;
    }
    setBusy(true);
    try {
      let fileUri = "";
      if (file) {
        try {
          const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
          fileUri = uploaded?.file_uri || "";
        } catch {
          setError("The file didn't upload. You can submit without it.");
          setBusy(false);
          return;
        }
      }
      const res = await showProof({
        data: {
          code,
          token,
          objectiveId: objective.id,
          text: text.trim(),
          resourceReference: url.trim(),
          fileUri,
        },
      });
      if (!res?.ok) {
        setError(res?.error || "Could not submit that proof.");
        return;
      }
      setResult(res.review);
      if (res.autoFinished) {
        toast("Demo mode: the squad signed off — final screen unlocked", {
          description: "One click, whole mission cycle.",
        });
      }
      onDone?.();
    } catch (e) {
      setError(e?.message || "Could not submit that proof.");
    } finally {
      setBusy(false);
    }
  }

  const style = result ? RESULT[result.recommendation] || RESULT.NEEDS_REVISION : null;

  return (
    <Dialog open={!!objective} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-[hsl(222_42%_7%)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-wide">
            Submit proof
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {objective?.title}
          </DialogDescription>
        </DialogHeader>

        {objective?.acceptance_criteria ? (
          <div className="rounded-lg border border-signal/25 bg-signal/8 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.18em] text-signal">Done means</p>
            <p className="mt-1 text-[12px] leading-relaxed text-foreground/85">
              {objective.acceptance_criteria}
            </p>
          </div>
        ) : null}

        {result ? (
          <div className="space-y-3">
            <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
              <p className={`font-display text-lg uppercase tracking-wide ${style.tone}`}>
                Play under review
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {style.label}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">{result.explanation}</p>
              {result.requirements_missing?.length ? (
                <ul className="mt-2 space-y-1">
                  {result.requirements_missing.map((r) => (
                    <li key={r} className="text-[11px] text-muted-foreground">
                      • {r}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
                <ShieldCheck className="h-3 w-3 text-neon" />
                A teammate confirms the call. XP only lands once.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-full items-center justify-center rounded-full bg-signal px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground"
            >
              Back to the squad
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="What did you do?" htmlFor="proof-text">
              <textarea
                id="proof-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="Three sources found (IPCC, IEA, NREL) and a 250-word summary written with citations — pasted below…"
                className={`${inputClass} resize-y leading-relaxed`}
              />
            </Field>
            <Field label="Link to the work" hint="Optional. The referee can't open links, so describe what's inside too." htmlFor="proof-url">
              <input
                id="proof-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/…"
                className={inputClass}
              />
            </Field>
            <Field label="Attach a file" hint="Optional — stored privately, shared only with your squad.">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3.5 py-2.5 text-xs text-muted-foreground hover:border-signal/40">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="truncate">{file ? file.name : "Choose a file"}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </Field>

            <ErrorLine>{error}</ErrorLine>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-signal px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-all hover:shadow-[0_0_28px_-6px_hsl(var(--signal)/0.85)] disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? "Sending to VAR…" : "Send to the referee"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
