import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import useMatch from "@/lib/useMatch";
import { getIdentity } from "@/lib/identity";

export const Route = createFileRoute("/match/$code_/receipt")({
  ssr: false,
  head: () => ({ meta: [{ title: "Contribution receipt — CARRIED" }] }),
  component: ReceiptPage,
});

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ReceiptPage() {
  const { code } = Route.useParams();
  const [identity, setIdentity] = useState(undefined);

  useEffect(() => {
    setIdentity(getIdentity(code));
  }, [code]);

  if (identity === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-signal" />
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-5 text-center">
        <p className="text-sm text-muted-foreground">
          Join the match on this device to view its contribution receipt.
        </p>
        <Link
          to="/join"
          search={{ code }}
          className="rounded-full bg-signal px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          Join match
        </Link>
      </div>
    );
  }

  return <Receipt code={code} token={identity.token} />;
}

function Receipt({ code, token }) {
  const { state, loading, error } = useMatch(code, token, 10000);

  if (loading && !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-signal" />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center text-sm text-muted-foreground">
        {error || "Could not load this receipt."}
      </div>
    );
  }

  const resolveName = (id) => state.players.find((p) => p.id === id)?.name || "Unassigned";
  const confirmed = state.objectives.filter((o) => o.status === "confirmed");
  const outstanding = state.objectives.filter((o) => o.status !== "confirmed");
  const acceptedTagIns = state.tagIns.filter((t) => t.status === "accepted");
  const resolvedRescues = state.rescues.filter((r) => r.status === "resolved");
  const teamHealth = state.health;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-8 sm:py-10 print:max-w-none print:px-0">
        <div className="mb-5 flex items-center justify-between print:hidden">
          <Link
            to="/match/$code"
            params={{ code }}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to match
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-foreground hover:border-signal/50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / save PDF
          </button>
        </div>

        <div className="panel rounded-2xl p-6 print:border-0 print:bg-white print:p-0 print:text-black">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5 print:border-black/20">
            <div>
              <p className="eyebrow text-signal print:text-black">Carried · contribution receipt</p>
              <h1 className="mt-2 font-display text-3xl uppercase leading-none tracking-wide text-foreground print:text-black">
                {state.match.title}
              </h1>
              <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-muted-foreground print:text-black/70">
                {state.match.brief || "No brief recorded."}
              </p>
            </div>
            <div className="text-right text-[11px] text-muted-foreground print:text-black/70">
              <p className="num">MATCH {state.match.code}</p>
              <p className="mt-1">Deadline {fmt(state.match.deadline)}</p>
              <p>Started {fmt(state.match.started_at)}</p>
              <p>Closed {fmt(state.match.ended_at || state.match.summary?.ended_at)}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Completion", value: `${teamHealth.completion}%` },
              { label: "Confirmed effort", value: `${teamHealth.confirmed_points} pts` },
              { label: "Missions confirmed", value: `${confirmed.length}/${state.objectives.length}` },
              { label: "Team health", value: `${teamHealth.score}/100` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border px-3 py-2.5 print:border-black/20"
              >
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground print:text-black/60">
                  {item.label}
                </p>
                <p className="num mt-1 text-base text-foreground print:text-black">{item.value}</p>
              </div>
            ))}
          </div>

          <section className="mt-7">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground print:text-black/60">
              Team
            </h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-border text-[9px] uppercase tracking-[0.12em] text-muted-foreground print:border-black/20 print:text-black/60">
                    <th className="py-2 pr-3 font-normal">Player</th>
                    <th className="py-2 pr-3 font-normal">Role</th>
                    <th className="py-2 pr-3 text-right font-normal">XP</th>
                    <th className="py-2 pr-3 text-right font-normal">Missions</th>
                    <th className="py-2 pr-3 text-right font-normal">Assists</th>
                    <th className="py-2 text-right font-normal">Tag-ins</th>
                  </tr>
                </thead>
                <tbody>
                  {state.players.map((player) => (
                    <tr key={player.id} className="border-b border-border/60 print:border-black/10">
                      <td className="py-2 pr-3 text-foreground print:text-black">{player.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground print:text-black/70">
                        {state.roles.find((r) => r.owner_player_id === player.id)?.title || "—"}
                      </td>
                      <td className="num py-2 pr-3 text-right">{player.stats?.xp || 0}</td>
                      <td className="num py-2 pr-3 text-right">{player.stats?.confirmed || 0}</td>
                      <td className="num py-2 pr-3 text-right">{player.stats?.assists || 0}</td>
                      <td className="num py-2 text-right">{player.stats?.tagIns || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-7">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground print:text-black/60">
              Confirmed missions
            </h2>
            <ul className="mt-2 space-y-2">
              {confirmed.map((mission) => {
                const evidence = mission.evidence?.[0];
                const humanConfirmed = (evidence?.reviews || []).some(
                  (r) => !r.is_ai && r.recommendation === "CONFIRMED"
                );
                return (
                  <li
                    key={mission.id}
                    className="rounded-lg border border-border px-3 py-2.5 print:border-black/15"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[12px] font-medium text-foreground print:text-black">
                        {mission.title}
                      </p>
                      <p className="num text-[10px] uppercase tracking-[0.1em] text-muted-foreground print:text-black/60">
                        {mission.effort_points} XP · {resolveName(mission.owner_id)} ·{" "}
                        {fmt(mission.confirmed_at)}
                      </p>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground print:text-black/70">
                      {mission.acceptance_criteria}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/80 print:text-black/50">
                      {evidence?.resource_reference ? `Reference: ${evidence.resource_reference} · ` : ""}
                      {humanConfirmed
                        ? "Self-reported, confirmed by a teammate"
                        : evidence
                          ? "Self-reported, AI-screened"
                          : "Marked done without submitted proof"}
                    </p>
                  </li>
                );
              })}
              {!confirmed.length ? (
                <li className="text-[12px] text-muted-foreground print:text-black/70">
                  No missions were confirmed.
                </li>
              ) : null}
            </ul>
          </section>

          {acceptedTagIns.length ? (
            <section className="mt-7">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground print:text-black/60">
                Ownership changes (tag-ins)
              </h2>
              <ul className="mt-2 space-y-1.5">
                {acceptedTagIns.map((tagIn) => {
                  const mission = state.objectives.find((o) => o.id === tagIn.objective_id);
                  return (
                    <li key={tagIn.id} className="text-[12px] text-foreground/90 print:text-black">
                      <span className="num text-[10px] uppercase tracking-[0.1em] text-muted-foreground print:text-black/60">
                        {resolveName(tagIn.original_owner_id)} → {resolveName(tagIn.accepting_owner_id)}
                      </span>{" "}
                      — {mission?.title}
                      {mission?.status === "confirmed" ? " (mission complete)" : " (in progress)"}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {resolvedRescues.length ? (
            <section className="mt-7">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground print:text-black/60">
                Rescue contributions
              </h2>
              <ul className="mt-2 space-y-1.5">
                {resolvedRescues.map((rescue) => {
                  const mission = state.objectives.find((o) => o.id === rescue.objective_id);
                  return (
                    <li key={rescue.id} className="text-[12px] text-foreground/90 print:text-black">
                      {resolveName(rescue.helper_id) || "A teammate"} assisted{" "}
                      {resolveName(rescue.requested_by)} on {mission?.title}
                      {mission?.status === "confirmed" ? " — verified" : " — not yet confirmed"}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {outstanding.length ? (
            <section className="mt-7">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground print:text-black/60">
                Outstanding work
              </h2>
              <ul className="mt-2 space-y-1.5">
                {outstanding.map((mission) => (
                  <li key={mission.id} className="text-[12px] text-foreground/90 print:text-black">
                    {mission.title} — {resolveName(mission.owner_id)} ·{" "}
                    <span className="uppercase text-[10px] tracking-[0.1em] text-warn print:text-black/60">
                      {mission.status.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-7 rounded-lg border border-border px-3 py-3 text-[10px] leading-relaxed text-muted-foreground print:border-black/20 print:text-black/70">
            <p className="uppercase tracking-[0.14em] text-foreground/80 print:text-black">
              How this was verified
            </p>
            <p className="mt-1.5">
              XP is awarded once per mission, only after submitted evidence was confirmed. The AI
              referee's opinion is advisory; a teammate made the final call. Items shown as
              "self-reported, AI-screened" were not independently checked by a person. Work that was
              never submitted does not appear here.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
