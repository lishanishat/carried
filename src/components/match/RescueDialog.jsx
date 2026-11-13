import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestRescue } from "@/lib/mission-fns";
import { Field, inputClass, ErrorLine } from "@/components/match/Field";

export default function RescueDialog({ code, token, objective, options = [], onClose, onDone }) {
  const ask = useServerFn(requestRescue);
  const [blocker, setBlocker] = useState("");
  const [help, setHelp] = useState("");
  const [links, setLinks] = useState("");
  const [dep, setDep] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setBlocker("");
    setHelp("");
    setLinks("");
    setDep("");
    setError("");
  }, [objective?.id]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (blocker.trim().length < 3) return setError("Describe what's blocking you.");
    if (help.trim().length < 3) return setError("Say what kind of help would unblock you.");
    setBusy(true);
    try {
      const res = await ask({
        data: {
          code,
          token,
          objectiveId: objective.id,
          blocker: blocker.trim(),
          requestedHelp: help.trim(),
          links: links.trim(),
          retainResponsibility: true,
          blockedOnObjectiveId: dep,
        },
      });
      if (!res?.ok) {
        setError(res?.error || "Could not send the rescue request.");
        return;
      }
      onDone?.();
      onClose();
    } catch (e) {
      setError(e?.message || "Could not send the rescue request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!objective} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-[hsl(222_42%_7%)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-wide">
            Call for backup
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {objective?.title} — you keep ownership. Asking for help never costs XP.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Field label="What's blocking you?" htmlFor="blocker">
            <textarea
              id="blocker"
              value={blocker}
              onChange={(e) => setBlocker(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="I can't find a credible source for the cost comparison — every link is a blog post."
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </Field>
          <Field label="What help do you need?" htmlFor="help">
            <textarea
              id="help"
              value={help}
              onChange={(e) => setHelp(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Someone with library access to pull two peer-reviewed cost figures."
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </Field>
          <Field label="Relevant links" htmlFor="rescue-links">
            <input
              id="rescue-links"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="https://docs.google.com/…"
              className={inputClass}
            />
          </Field>
          {options.length ? (
            <Field label="Waiting on a specific mission?" htmlFor="rescue-dep">
              <select
                id="rescue-dep"
                value={dep}
                onChange={(e) => setDep(e.target.value)}
                className={inputClass}
              >
                <option value="">No — it's something else</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <p className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-[11px] text-muted-foreground">
            You stay the owner. A teammate volunteers, you both show up in the timeline, and the
            helper earns assist XP when the mission is confirmed.
          </p>

          <ErrorLine>{error}</ErrorLine>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-danger px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-all hover:shadow-[0_0_28px_-6px_hsl(var(--danger)/0.9)] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LifeBuoy className="h-4 w-4" />}
            {busy ? "Sending…" : "Send rescue request"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
