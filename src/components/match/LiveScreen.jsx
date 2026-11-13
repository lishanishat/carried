import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Flag,
  Inbox,
  Loader2,
  Skull,
  Users,
} from "lucide-react";
import PlayerCard from "@/components/match/PlayerCard";
import MissionCard from "@/components/match/MissionCard";
import EventFeed from "@/components/match/EventFeed";
import MatchHeader from "@/components/match/MatchHeader";
import RescueCard from "@/components/match/RescueCard";
import HandoffCard from "@/components/match/HandoffCard";
import FinalBossBanner from "@/components/match/FinalBossBanner";
import ProofDialog from "@/components/match/ProofDialog";
import RescueDialog from "@/components/match/RescueDialog";
import TagInDialog from "@/components/match/TagInDialog";
import { ErrorLine } from "@/components/match/Field";
import {
  acceptTagIn,
  cancelTagIn,
  decideReview,
  endMatch,
  resolveRescue,
  setFinalBoss,
  startObjective,
  volunteerRescue,
} from "@/lib/mission-fns";
import { EVENT_LABEL } from "@/lib/xp";

function SectionLabel({ children, aside }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{children}</p>
      {aside ? <span className="num text-[10px] text-muted-foreground/70">{aside}</span> : null}
    </div>
  );
}

export default function LiveScreen({ state, code, token, refresh, casterEnabled }) {
  const startFn = useServerFn(startObjective);
  const decideFn = useServerFn(decideReview);
  const takeTagInFn = useServerFn(acceptTagIn);
  const cancelTagInFn = useServerFn(cancelTagIn);
  const volunteerFn = useServerFn(volunteerRescue);
  const resolveFn = useServerFn(resolveRescue);
  const bossFn = useServerFn(setFinalBoss);
  const endFn = useServerFn(endMatch);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [proofTarget, setProofTarget] = useState(null);
  const [rescueTarget, setRescueTarget] = useState(null);
  const [tagTarget, setTagTarget] = useState(null);

  const seenEvent = useRef(null);
  useEffect(() => {
    const latest = state.events[0];
    if (!latest) return;
    if (seenEvent.current === null) {
      seenEvent.current = latest.id;
      return;
    }
    if (latest.id !== seenEvent.current) {
      seenEvent.current = latest.id;
      toast(latest.caster_text || EVENT_LABEL[latest.type] || "Match update", {
        description: EVENT_LABEL[latest.type],
      });
    }
  }, [state.events]);

  async function run(fn, payload, successMessage) {
    setError("");
    setBusy(true);
    try {
      const res = await fn({ data: { code, token, ...payload } });
      if (!res?.ok) {
        setError(res?.error || "That didn't work.");
        return false;
      }
      await refresh();
      if (successMessage) toast(successMessage);
      return true;
    } catch (e) {
      setError(e?.message || "That didn't work.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const objById = Object.fromEntries(state.objectives.map((o) => [o.id, o]));
  const resolveName = (id) => state.players.find((p) => p.id === id)?.name || "Unassigned";
  const prereqsFor = (id) =>
    state.dependencies
      .filter((d) => d.objective_id === id)
      .map((d) => objById[d.prerequisite_objective_id])
      .filter(Boolean);
  const dependentsFor = (id) =>
    state.dependencies.filter((d) => d.prerequisite_objective_id === id).length;
  const tagInFor = (id) =>
    state.tagIns.find((t) => t.objective_id === id && t.status === "open") || null;

  const openRescues = state.rescues.filter(
    (r) =>
      (r.status === "open" || r.status === "volunteered") &&
      objById[r.objective_id]?.status !== "confirmed"
  );

  const myMissions = state.objectives.filter((o) => o.owner_id === state.me.id);
  const handoffs = state.tagIns
    .filter((t) => t.status === "open" && t.original_owner_id !== state.me.id)
    .map((t) => ({ tagIn: t, objective: objById[t.objective_id] }))
    .filter((h) => h.objective && h.objective.status !== "confirmed");
  const handoffObjectiveIds = new Set(handoffs.map((h) => h.objective.id));
  const others = state.players.filter((p) => p.id !== state.me.id);
  const confirmedCount = state.objectives.filter((o) => o.status === "confirmed").length;

  const bossActive =
    state.match.final_boss_active ||
    (state.health.hours_left !== null && state.health.hours_left < 24);
  const remainingMissions = state.objectives.filter((o) => o.status !== "confirmed");

  function renderMission(objective) {
    return (
      <MissionCard
        key={objective.id}
        objective={objective}
        prereqs={prereqsFor(objective.id)}
        dependentsCount={dependentsFor(objective.id)}
        ownerName={resolveName(objective.owner_id)}
        roleTitle={state.roles.find((r) => r.id === objective.role_id)?.title || "Mission"}
        resolveName={resolveName}
        me={state.me}
        players={state.players}
        busy={busy}
        tagIn={tagInFor(objective.id)}
        onStart={(id) => run(startFn, { objectiveId: id }, "Mission started")}
        onProof={(obj) => setProofTarget(obj)}
        onRescue={(obj) => setRescueTarget(obj)}
        onTagIn={(obj) => setTagTarget(obj)}
        onTakeTagIn={(id) => run(takeTagInFn, { tagInId: id }, "Baton passed")}
        onCancelTagIn={(id) => run(cancelTagInFn, { tagInId: id }, "Handoff cancelled")}
        onDecide={(evidenceId, decision, note) =>
          run(decideFn, { evidenceId, decision, note }, "Review saved")
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-8 pt-4 sm:px-6">
      <MatchHeader match={state.match} health={state.health} />

      <div className="mt-3">
        <FinalBossBanner
          health={state.health}
          active={state.match.final_boss_active}
          isHost={state.me.is_host}
          busy={busy}
          onActivate={() => run(bossFn, { active: true }, "Final Boss mode activated")}
        />
        {bossActive && remainingMissions.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-danger">
              <Skull className="h-3 w-3" />
              Boss missions
            </span>
            {remainingMissions.slice(0, 6).map((m) => (
              <span
                key={m.id}
                className="rounded-[6px] border border-danger/25 bg-danger/5 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {m.title}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* squad */}
      <section className="mt-4">
        <SectionLabel aside={`${state.players.length} players`}>
          <span className="flex items-center gap-1.5">
            <Users className="h-3 w-3 text-signal" />
            Squad
          </span>
        </SectionLabel>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {state.players.map((player) => {
            const mine = state.objectives.filter((o) => o.owner_id === player.id);
            const total = mine.reduce((s, o) => s + (o.effort_points || 0), 0) || 1;
            const done = mine
              .filter((o) => o.status === "confirmed")
              .reduce((s, o) => s + (o.effort_points || 0), 0);
            return (
              <PlayerCard
                key={player.id}
                player={player}
                role={state.roles.find((r) => r.owner_player_id === player.id)}
                isMe={player.id === state.me.id}
                progress={(done / total) * 100}
              />
            );
          })}
        </div>
      </section>

      {error ? (
        <div className="mt-3">
          <ErrorLine>{error}</ErrorLine>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
        {/* main workspace */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[1.5rem] uppercase leading-none tracking-[0.03em] text-foreground">
              Mission board
            </h2>
            <span className="num text-[10.5px] text-muted-foreground">
              {confirmedCount}/{state.objectives.length} confirmed
            </span>
          </div>

          {/* 1. my tasks */}
          <section className="mt-3">
            <SectionLabel aside={`${myMissions.filter((m) => m.status === "confirmed").length}/${myMissions.length}`}>
              Your missions
            </SectionLabel>
            {myMissions.length ? (
              <div className="grid gap-2.5 md:grid-cols-2">{myMissions.map(renderMission)}</div>
            ) : (
              <div className="rounded-xl border border-dashed border-border px-3.5 py-4 text-[12px] text-muted-foreground">
                Nothing assigned to you yet.
              </div>
            )}
          </section>

          {/* 2. requests needing action */}
          {openRescues.length || handoffs.length ? (
            <section className="mt-5">
              <SectionLabel aside={`${openRescues.length + handoffs.length} open`}>
                Needs your action
              </SectionLabel>
              <div className="grid gap-2.5 md:grid-cols-2">
                {openRescues.map((rescue) => {
                  const objective = objById[rescue.objective_id];
                  return (
                    <RescueCard
                      key={rescue.id}
                      rescue={rescue}
                      objective={objective}
                      requesterName={resolveName(rescue.requested_by)}
                      helperName={rescue.helper_id ? resolveName(rescue.helper_id) : null}
                      mine={rescue.requested_by === state.me.id}
                      canVolunteer={rescue.status === "open" && rescue.requested_by !== state.me.id}
                      onVolunteer={() =>
                        run(volunteerFn, { rescueId: rescue.id }, "You're in — go help")
                      }
                      onResolve={() => run(resolveFn, { rescueId: rescue.id }, "Marked as resolved")}
                      busy={busy}
                    />
                  );
                })}

                {handoffs.map(({ tagIn, objective }) => (
                  <HandoffCard
                    key={tagIn.id}
                    tagIn={tagIn}
                    objective={objective}
                    ownerName={resolveName(tagIn.original_owner_id)}
                    eligibleNames={state.players
                      .filter((p) => p.id !== tagIn.original_owner_id)
                      .map((p) => p.name)}
                    mine={false}
                    onAccept={() => run(takeTagInFn, { tagInId: tagIn.id }, "Baton passed")}
                    onCancel={() => run(cancelTagInFn, { tagInId: tagIn.id }, "Handoff cancelled")}
                    busy={busy}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* 3. rest of the board */}
          {others.map((player) => {
            const missions = state.objectives.filter(
              (o) => o.owner_id === player.id && !handoffObjectiveIds.has(o.id)
            );
            if (!missions.length) return null;
            return (
              <section key={player.id} className="mt-5">
                <SectionLabel
                  aside={`${missions.filter((m) => m.status === "confirmed").length}/${missions.length}`}
                >
                  {player.name}'s missions
                </SectionLabel>
                <div className="grid gap-2.5 md:grid-cols-2">{missions.map(renderMission)}</div>
              </section>
            );
          })}

          {!state.objectives.length ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-border px-3.5 py-5 text-[12px] text-muted-foreground">
              <Inbox className="h-4 w-4" />
              No missions on the board yet. Ask the host to finish draft day.
            </div>
          ) : null}
        </div>

        {/* secondary column */}
        <aside className="space-y-3 lg:sticky lg:top-[60px] lg:self-start">
          <EventFeed events={state.events} casterOn={casterEnabled} />

          <div className="panel rounded-xl p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <Activity className="h-3 w-3 text-signal" />
              What's moving the meter
            </p>
            <ul className="mt-2 space-y-1.5">
              {(state.health.reasons || []).map((reason) => (
                <li
                  key={reason}
                  className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground"
                >
                  <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-muted-foreground/50" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {state.me.is_host ? (
            <div className="panel rounded-xl p-3.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Host controls
              </p>
              {confirmEnd ? (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => run(endFn, {}, "Match complete")}
                    disabled={busy}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-danger px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Flag className="h-3 w-3" />}
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmEnd(false)}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center rounded-[8px] border border-border px-3 text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmEnd(true)}
                  disabled={busy}
                  className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] border border-danger/45 bg-danger/10 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-danger transition-colors hover:bg-danger/20 disabled:opacity-60"
                >
                  <Flag className="h-3 w-3" />
                  End match
                </button>
              )}
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/70">
                Closes the match and locks the final scoreboard.
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      <ProofDialog
        code={code}
        token={token}
        objective={proofTarget}
        onClose={() => setProofTarget(null)}
        onDone={refresh}
      />
      <RescueDialog
        code={code}
        token={token}
        objective={rescueTarget}
        options={state.objectives.filter(
          (o) => o.id !== rescueTarget?.id && o.status !== "confirmed"
        )}
        onClose={() => setRescueTarget(null)}
        onDone={refresh}
      />
      <TagInDialog
        code={code}
        token={token}
        objective={tagTarget}
        onClose={() => setTagTarget(null)}
        onDone={refresh}
      />
    </div>
  );
}
