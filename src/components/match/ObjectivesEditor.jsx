import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addObjective, deleteObjective, updateObjective } from "@/lib/draft-fns";
import { Field, inputClass, ErrorLine } from "@/components/match/Field";

const empty = { title: "", description: "", acceptance_criteria: "", effort_points: 120, difficulty: "Medium" };

export default function ObjectivesEditor({ code, token, roleId, objective, onClose, onDone }) {
  const saveFn = useServerFn(updateObjective);
  const addFn = useServerFn(addObjective);
  const delFn = useServerFn(deleteObjective);

  const isNew = !objective;
  const open = !!roleId;
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (objective) {
      setForm({
        title: objective.title || "",
        description: objective.description || "",
        acceptance_criteria: objective.acceptance_criteria || "",
        effort_points: objective.effort_points || 100,
        difficulty: objective.difficulty || "Medium",
      });
    } else {
      setForm(empty);
    }
  }, [open, objective, roleId]);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.title.trim().length < 2) return setError("Give the mission a name.");
    setBusy(true);
    try {
      const payload = {
        code,
        token,
        title: form.title.trim(),
        description: form.description.trim(),
        acceptance_criteria: form.acceptance_criteria.trim(),
        effort_points: Number(form.effort_points) || 100,
        difficulty: form.difficulty,
      };
      const res = isNew
        ? await addFn({ data: { ...payload, roleId } })
        : await saveFn({ data: { ...payload, objectiveId: objective.id } });
      if (!res?.ok) {
        setError(res?.error || "Could not save the mission.");
        return;
      }
      await onDone?.();
      onClose();
    } catch (e) {
      setError(e?.message || "Could not save the mission.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!objective) return;
    setBusy(true);
    try {
      const res = await delFn({ data: { code, token, objectiveId: objective.id } });
      if (!res?.ok) {
        setError(res?.error || "Could not remove the mission.");
        return;
      }
      await onDone?.();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-[hsl(222_42%_7%)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-wide">
            {isNew ? "Add a mission" : "Edit mission"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Missions must be verifiable — name the artifact and the amount.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Mission name" htmlFor="obj-title">
            <input
              id="obj-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={140}
              placeholder="Identify three credible sources and write a 250-word summary"
              className={inputClass}
            />
          </Field>
          <Field label="Description" htmlFor="obj-desc">
            <textarea
              id="obj-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              maxLength={1200}
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </Field>
          <Field label="Done means" htmlFor="obj-ac" hint="Shown to the player and to the AI referee.">
            <textarea
              id="obj-ac"
              value={form.acceptance_criteria}
              onChange={(e) => set("acceptance_criteria", e.target.value)}
              rows={2}
              maxLength={800}
              placeholder="Three cited sources plus a 250-word summary with in-text citations."
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Effort (XP)" htmlFor="obj-effort">
              <input
                id="obj-effort"
                type="number"
                min={20}
                max={500}
                step={10}
                value={form.effort_points}
                onChange={(e) => set("effort_points", e.target.value)}
                className={`${inputClass} num`}
              />
            </Field>
            <Field label="Difficulty" htmlFor="obj-diff">
              <select
                id="obj-diff"
                value={form.difficulty}
                onChange={(e) => set("difficulty", e.target.value)}
                className={inputClass}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </Field>
          </div>

          <ErrorLine>{error}</ErrorLine>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-signal px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isNew ? <Plus className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {isNew ? "Add mission" : "Save"}
            </button>
            {!isNew ? (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-danger/40 px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-danger disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
