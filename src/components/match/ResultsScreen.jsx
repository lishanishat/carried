import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Award, Copy, Crown, FileText, Flag, LifeBuoy, Trophy, Zap } from "lucide-react";

function Stat({ label, value, tone = "text-foreground" }) {
  return (
    <div className="panel rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`num mt-2 text-2xl ${tone}`}>{value}</p>
    </div>
  );
}

export default function ResultsScreen({ state, code }) {
  const summary = state.match.summary || null;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    import("canvas-confetti")
      .then((mod) => {
        if (cancelled) return;
        const fire = mod.default;
        fire({ particleCount: 90, spread: 70, origin: { y: 0.15 }, colors: ["#00E5FF", "#B8FF35", "#ffffff"] });
        setTimeout(() => fire({ particleCount: 50, spread: 100, origin: { y: 0.1 }, colors: ["#00E5FF", "#B8FF35"] }), 350);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const leaderboard = summary?.leaderboard || [];
  const awards = summary?.awards || [];
  const mvp = summary?.mvp || leaderboard[0] || null;
  const completion = summary?.completion ?? state.health.completion;
  const confirmedPoints = summary?.total_confirmed_points ?? state.health.confirmed_points;
  const unfinished = summary?.unfinished || state.objectives.filter((o) => o.status !== "confirmed");

  async function share() {
    const lines = [
      `${state.match.title} — MATCH COMPLETE`,
      `Completion ${completion}% · ${confirmedPoints} effort points banked`,
      "",
      ...leaderboard.map(
        (p, i) => `${i + 1}. ${p.name} — ${p.xp} XP (${p.confirmed} missions, ${p.assists} assists)`
      ),
      "",
      ...awards.map((a) => `${a.title}: ${a.name}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      toast("Scoreboard copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Couldn't copy — select the scoreboard manually.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
      <div className="relative overflow-hidden rounded-2xl border border-signal/25 p-6 sm:p-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 130% at 30% 0%, rgba(0,229,255,0.22) 0%, rgba(8,11,18,0) 65%)",
          }}
        />
        <div className="relative">
          <p className="eyebrow flex items-center gap-1.5 text-neon">
            <Flag className="h-3 w-3" />
            Match complete
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase leading-[0.9] tracking-[0.01em] text-foreground sm:text-6xl">
            {state.match.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {completion}% of the project shipped. {confirmedPoints} effort points were banked with
            verified proof. Here's how the squad did.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-signal/50"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copied" : "Copy scoreboard"}
            </button>
            <Link
              to="/match/$code/receipt"
              params={{ code }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-signal/50"
            >
              <FileText className="h-3 w-3" />
              Contribution receipt
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Project completion" value={`${completion}%`} tone="text-signal" />
        <Stat label="Confirmed effort" value={`${confirmedPoints} pts`} tone="text-neon" />
        <Stat
          label="Missions confirmed"
          value={`${state.objectives.filter((o) => o.status === "confirmed").length}/${state.objectives.length}`}
        />
      </div>

      {mvp ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-warn/30 bg-warn/[0.06] p-5">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-warn">
            <Crown className="h-3.5 w-3.5" />
            MVP
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <p className="font-display text-3xl uppercase tracking-wide text-foreground">{mvp.name}</p>
            <p className="num text-xl text-warn">{mvp.xp} XP</p>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Highest verified XP
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="panel overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-signal" />
              Final leaderboard
            </p>
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
              verified XP only
            </span>
          </div>
          <ul className="divide-y divide-border/60">
            {(leaderboard.length ? leaderboard : state.players).map((p, index) => (
              <li key={p.player_id || p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="num w-4 text-xs text-muted-foreground/70">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base uppercase tracking-wide text-foreground">
                    {p.name}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5 text-neon" />
                      {p.confirmed ?? 0} missions
                    </span>
                    <span className="flex items-center gap-1">
                      <LifeBuoy className="h-2.5 w-2.5 text-signal" />
                      {p.rescues ?? 0} rescues
                    </span>
                    <span>{p.tagIns ?? 0} tag-ins</span>
                    <span>{p.assists ?? 0} assists</span>
                  </p>
                </div>
                <span className="num shrink-0 text-sm text-signal">{(p.xp || 0).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Award className="h-3.5 w-3.5 text-neon" />
            Awards
          </p>
          {awards.map((award) => (
            <div key={award.key} className="panel rounded-xl p-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-neon">{award.title}</p>
              <p className="mt-1 font-display text-xl uppercase tracking-wide text-foreground">
                {award.name}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                {award.description}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
                {award.criteria}
              </p>
            </div>
          ))}
          {!awards.length ? (
            <p className="panel rounded-xl p-4 text-[12px] leading-relaxed text-muted-foreground">
              No awards this run — confirm a mission or deliver a rescue and the podium fills up.
            </p>
          ) : null}
        </div>
      </div>

      {unfinished.length ? (
        <div className="panel mt-4 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Left on the board
          </p>
          <ul className="mt-2 space-y-1.5">
            {unfinished.map((mission) => (
              <li key={mission.id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="truncate text-foreground/85">{mission.title}</span>
                <span className="num shrink-0 text-[10px] uppercase tracking-[0.1em] text-warn">
                  {mission.status.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-neon/30 bg-neon/[0.06] p-4 text-center">
          <p className="font-display text-lg uppercase tracking-wide text-neon">
            Every mission confirmed
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/create"
          className="inline-flex items-center justify-center rounded-full bg-signal px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          Run it back
        </Link>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
