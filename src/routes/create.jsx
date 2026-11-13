import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Radio } from "lucide-react";
import FormShell from "@/components/match/FormShell";
import { createMatch } from "@/lib/match-fns";
import { getRememberedName, rememberName, saveIdentity } from "@/lib/identity";

export const Route = createFileRoute("/create")({
  head: () => ({ meta: [{ title: "Create a match — CARRIED" }] }),
  component: CreateMatch,
});

function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function CreateMatch() {
  const navigate = useNavigate();
  const create = useServerFn(createMatch);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [teamSize, setTeamSize] = useState(3);
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(getRememberedName());
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(18, 0, 0, 0);
    setDeadline(toLocalInput(d));
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("Add your display name.");
    if (!title.trim()) return setError("Add a project title.");
    if (!deadline) return setError("Pick a deadline.");

    const when = new Date(deadline);
    if (Number.isNaN(when.getTime())) return setError("That deadline doesn't look right.");
    if (when.getTime() < Date.now()) return setError("The deadline has to be in the future.");

    setBusy(true);
    try {
      const res = await create({
        data: {
          name: name.trim(),
          title: title.trim(),
          brief: brief.trim(),
          deadline: when.toISOString(),
          teamSize,
        },
      });
      if (!res?.ok) {
        setError(res?.error || "Could not create the match.");
        return;
      }
      rememberName(name.trim());
      saveIdentity(res.code, { token: res.token, playerId: res.playerId, name: name.trim() });
      navigate({ to: "/match/$code", params: { code: res.code } });
    } catch (e) {
      setError(e?.message || "Could not create the match.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-signal/60 focus:outline-none focus:ring-2 focus:ring-signal/20";

  return (
    <FormShell
      eyebrow="New match"
      title="Open a match"
      subtitle="You'll get a four-letter code to share. Your squad joins from their own phones — no accounts."
    >
      <form onSubmit={onSubmit} className="panel rounded-2xl p-6 sm:p-7">
        <div className="space-y-5">
          <div>
            <label htmlFor="host-name" className="eyebrow mb-2 block text-muted-foreground">
              Your display name
            </label>
            <input
              id="host-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Maya"
              className={field}
              autoComplete="nickname"
            />
          </div>

          <div>
            <label htmlFor="title" className="eyebrow mb-2 block text-muted-foreground">
              Project title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Renewable energy policy deck"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="brief" className="eyebrow mb-2 block text-muted-foreground">
              Project brief
            </label>
            <textarea
              id="brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={5}
              maxLength={6000}
              placeholder="Paste the messy brief. e.g. 10-minute group presentation on US renewable energy policy. Need three credible sources, a cost comparison of solar vs wind, eight slides, a speaker script and a one-page handout. Due next Friday."
              className={`${field} resize-y leading-relaxed`}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              The draft engine reads this to build fair missions. You can edit everything before the
              match starts.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="deadline" className="eyebrow mb-2 block text-muted-foreground">
                Deadline
              </label>
              <input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={`${field} [color-scheme:dark]`}
              />
            </div>
            <div>
              <p className="eyebrow mb-2 block text-muted-foreground">Team size</p>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTeamSize(n)}
                    className={`num rounded-xl border px-3 py-3 text-sm transition-all ${
                      teamSize === n
                        ? "border-signal bg-signal/15 text-signal"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-signal/40"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-signal px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-all hover:shadow-[0_0_32px_-6px_hsl(var(--signal)/0.85)] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          {busy ? "Opening match…" : "Create match"}
        </button>
      </form>
    </FormShell>
  );
}
