import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, PencilRuler, Sparkles, Users } from "lucide-react";
import JoinCodePanel from "@/components/match/JoinCodePanel";
import PlayerCard from "@/components/match/PlayerCard";
import { Field, inputClass, ErrorLine } from "@/components/match/Field";
import { createRole, generateDraft, saveSetup } from "@/lib/draft-fns";

export default function LobbyScreen({ state, code, token, refresh }) {
  const save = useServerFn(saveSetup);
  const generateDraftFn = useServerFn(generateDraft);
  const createRoleFn = useServerFn(createRole);
  const isHost = state.me.is_host;
  const [brief, setBrief] = useState(state.match.brief || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setBrief(state.match.brief || "");
  }, [state.match.brief]);

  async function generate() {
    setError("");
    if (brief.trim().length < 20) {
      setError("Paste a real brief (a couple of sentences) so the draft engine has something to work with.");
      return;
    }
    setBusy(true);
    try {
      const saved = await save({ data: { code, token, brief: brief.trim() } });
      if (!saved?.ok) {
        setError(saved?.error || "Could not save the brief.");
        return;
      }
      const res = await generateDraftFn({ data: { code, token } });
      if (!res?.ok) {
        setError(res?.error || "The AI draft failed. Try again, or set the roles up manually.");
        return;
      }
      await refresh();
    } catch (e) {
      setError(e?.message || "The AI draft failed. Try again, or set the roles up manually.");
    } finally {
      setBusy(false);
    }
  }

  async function manualStart() {
    setError("");
    setBusy(true);
    try {
      const res = await createRoleFn({
        data: { code, token, title: "Team member", description: "Missions defined by the host." },
      });
      if (!res?.ok) {
        setError(res?.error || "Could not start a manual draft.");
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
      <JoinCodePanel code={code} joined={state.players.length} teamSize={state.match.team_size} />

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_400px]">
        <div>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-signal" />
              Squad in the lobby
            </p>
            <span className="num text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {state.players.length}/{state.match.team_size}
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {state.players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                role={null}
                isMe={player.id === state.me.id}
                progress={0}
                compact
              />
            ))}
            {Array.from({ length: Math.max(0, state.match.team_size - state.players.length) }).map(
              (_, i) => (
                <div
                  key={`slot-${i}`}
                  className="flex items-center justify-between rounded-xl border border-dashed border-border/80 px-4 py-6"
                >
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                    Waiting for player
                  </p>
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-signal" />
                    <span
                      className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-signal"
                      style={{ animationDelay: "0.4s" }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-signal"
                      style={{ animationDelay: "0.8s" }}
                    />
                  </span>
                </div>
              )
            )}
          </div>

          <div className="panel mt-5 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Next up</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {isHost
                ? "Paste the project brief, hit generate, then let everyone claim a role before you start the match."
                : "The host is drafting your missions. Once they're on the board you'll claim a role and lock in."}
            </p>
          </div>
        </div>

        <div className="panel rounded-xl p-4 sm:p-5">
          <p className="flex items-center gap-2 font-display text-lg uppercase tracking-wide text-foreground">
            <Bot className="h-4 w-4 text-signal" />
            Draft day
          </p>

          {isHost ? (
            <div className="mt-4 space-y-4">
              <Field
                label="Project brief"
                htmlFor="lobby-brief"
                hint="Messy is fine. The engine splits it into fair, verifiable missions."
              >
                <textarea
                  id="lobby-brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  rows={7}
                  maxLength={6000}
                  placeholder="10-minute group presentation on US renewable energy policy. Need three credible sources, a cost comparison of solar vs wind, eight slides, a speaker script and a one-page handout. Due next Friday."
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </Field>
              <ErrorLine>{error}</ErrorLine>
              <button
                type="button"
                onClick={generate}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-signal px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-all hover:shadow-[0_0_28px_-6px_hsl(var(--signal)/0.85)] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy ? "Drafting missions…" : "Generate missions"}
              </button>
              <button
                type="button"
                onClick={manualStart}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-signal/40 hover:text-foreground disabled:opacity-60"
              >
                <PencilRuler className="h-3.5 w-3.5" />
                Build roles manually
              </button>
              <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                You can edit every mission before the match starts. Players can join while you draft.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Waiting on the host to generate missions…
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-signal" />
                <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Live sync on
                </span>
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-border/70 pt-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Brief</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground/90">
              {state.match.brief || "No brief yet."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
