import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestTagIn } from "@/lib/mission-fns";
import { Field, inputClass, ErrorLine } from "@/components/match/Field";

export default function TagInDialog({ code, token, objective, onClose, onDone }) {
  const handoff = useServerFn(requestTagIn);
  const [finished, setFinished] = useState("");
  const [remaining, setRemaining] = useState("");
  const [links, setLinks] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFinished("");
    setRemaining("");
    setLinks("");
    setReason("");
    setError("");
  }, [objective?.id]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (finished.trim().length < 3) return setError("Say what's already finished.");
    if (remaining.trim().length < 3) return setError("Say what's left to do.");
    setBusy(true);
    try {
      const res = await handoff({
        data: {
          code,
          token,
          objectiveId: objective.id,
          finishedWork: finished.trim(),
          remainingWork: remaining.trim(),
          resourceLinks: links.trim(),
          reason: reason.trim(),
        },
      });
      if (!res?.ok) {
        setError(res?.error || "Could not request the handoff.");
        return;
      }
      onDone?.();
      onClose();
    } catch (e) {
      setError(e?.message || "Could not request the handoff.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!objective} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-[hsl(222_42%_7%)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-wide">
            Call a tag-in
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {objective?.title} — hand off responsibility without losing the work already done.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Field label="What's finished?" htmlFor="finished">
            <textarea
              id="finished"
              value={finished}
              onChange={(e) => setFinished(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="Found two sources and started the summary — 180 of 250 words."
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </Field>
          <Field label="What's left?" htmlFor="remaining">
            <textarea
              id="remaining"
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="One more credible source and the final paragraph."
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </Field>
          <Field label="Where's the work?" htmlFor="tag-links">
            <input
              id="tag-links"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="https://docs.google.com/…"
              className={inputClass}
            />
          </Field>
          <Field label="Why the handoff?" hint="Optional — keeps the squad in the loop." htmlFor="tag-reason">
            <input
              id="tag-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={400}
              placeholder="I have to leave for my shift."
              className={inputClass}
            />
          </Field>

          <p className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-[11px] text-muted-foreground">
            All notes, submissions and verified XP stay with the mission. The player who tags in
            earns the finish; you keep a clean-handoff bonus.
          </p>

          <ErrorLine>{error}</ErrorLine>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-pink-400 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#180713] transition-all hover:shadow-[0_0_28px_-6px_rgba(244,114,182,0.9)] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
            {busy ? "Posting…" : "Post handoff"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
