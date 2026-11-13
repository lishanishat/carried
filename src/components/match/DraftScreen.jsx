import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Lock, Pencil, Play, Plus, Sparkles, UserPlus } from "lucide-react";
import PlayerCard from "@/components/match/PlayerCard";
import EffortBalance from "@/components/match/EffortBalance";
import ObjectivesEditor from "@/components/match/ObjectivesEditor";
import { ErrorLine, inputClass } from "@/components/match/Field";
import { claimRole, createRole, startMatch } from "@/lib/draft-fns";

function RoleCard({ role, missions, players, me, isHost, busy, onClaim, onRelease, onEdit, onAdd }) {
  const owner = players.find((p) => p.id === role.owner_player_id);
  const mine = role.owner_player_id === me.id;

  return (
    <section className="panel rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl uppercase leading-none tracking-wide text-foreground">
            {role.title}
          </h3>
          <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-muted-foreground">
            {role.description}
          </p>
          <p className="num mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
            {role.estimated_effort} effort pts · {missions.length} missions
          </p>
        </div>

        {owner ? (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${
                mine
                  ? "border-signal/40 bg-signal/10 text-signal"
                  : "border-neon/30 bg-neon/5 text-neon"
              }`}
            >
              <Lock className="h-3 w-3" />
              {owner.name}
              {mine ? " (you)" : ""}
            </span>
            {mine ? (
              <button
                type="button"
                onClick={() => onRelease(role.id)}
                disabled={busy}
                className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-danger disabled:opacity-60"
              >
                Release
              </button>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onClaim(role.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-signal px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-all hover:shadow-[0_0_24px_-6px_hsl(var(--signal)/0.85)] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
            Lock this role
          </button>
        )}
      </div>

      <ul className="mt-3.5 divide-y divide-border/60 border-t border-border/60">
        {missions.map((mission) => (
          <li key={mission.id} className="py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-snug text-foreground">{mission.title}</p>
                {mission.acceptance_criteria ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    <span className="uppercase tracking-[0.12em] text-signal/80">Done means: </span>
                    {mission.acceptance_criteria}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="num text-[10px] uppercase tracking-[0.12em] text-neon">
                  {mission.effort_points} XP
                </span>
                {isHost ? (
                  <button
                    type="button"
                    onClick={() => onEdit(role.id, mission)}
                    className="text-muted-foreground hover:text-signal"
                    title="Edit mission"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
        {!missions.length ? (
          <li className="py-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">
            No missions yet
          </li>
        ) : null}
      </ul>

      {isHost ? (
        <button
          type="button"
          onClick={() => onAdd(role.id)}
          className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-signal"
        >
          <Plus className="h-3 w-3" />
          Add mission
        </button>
      ) : null}
    </section>
  );
}

export default function DraftScreen({ state, code, token, refresh }) {
  const claimFn = useServerFn(claimRole);
  const startFn = useServerFn(startMatch);
  const createRoleFn = useServerFn(createRole);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null);
  const [newRole, setNewRole] = useState("");

  const isHost = state.me.is_host;
  const roles = state.roles;
  const unclaimed = roles.filter((r) => !r.owner_player_id).length;

  async function claim(roleId, release = false) {
    setError("");
    setBusy(true);
    try {
      const res = await claimFn({ data: { code, token, roleId, release } });
      if (!res?.ok) setError(res?.error || "Could not update that role.");
      else await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setError("");
    setBusy(true);
    try {
      const res = await startFn({ data: { code, token } });
      if (!res?.ok) setError(res?.error || "Could not start the match.");
      else await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addRole() {
    if (newRole.trim().length < 2) return;
    setBusy(true);
    try {
      const res = await createRoleFn({ data: { code, token, title: newRole.trim() } });
      if (!res?.ok) setError(res?.error || "Could not add that role.");
      else {
        setNewRole("");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="panel-glow rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow flex items-center gap-1.5 text-signal">
              <Sparkles className="h-3 w-3" />
              Draft day
            </p>
            <h1 className="mt-2 font-display text-2xl uppercase leading-tight tracking-wide text-foreground sm:text-3xl">
              {state.match.title}
            </h1>
            {state.match.overview ? (
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {state.match.overview}
              </p>
            ) : null}
          </div>

          <div className="w-full sm:w-auto">
            {isHost ? (
              <button
                type="button"
                onClick={start}
                disabled={busy || unclaimed > 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neon px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-all hover:shadow-[0_0_30px_-6px_hsl(var(--neon)/0.9)] disabled:opacity-50 sm:w-auto"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Start match
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-signal" />
                Waiting for host
              </span>
            )}
            <p className="mt-2 text-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:text-right">
              {unclaimed > 0
                ? `${unclaimed} role${unclaimed > 1 ? "s" : ""} still unclaimed`
                : "All roles locked"}
            </p>
          </div>
        </div>
        {error ? <div className="mt-4"><ErrorLine>{error}</ErrorLine></div> : null}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              missions={state.objectives.filter((o) => o.role_id === role.id)}
              players={state.players}
              me={state.me}
              isHost={isHost}
              busy={busy}
              onClaim={(id) => claim(id, false)}
              onRelease={(id) => claim(id, true)}
              onEdit={(roleId, objective) => setEditor({ roleId, objective })}
              onAdd={(roleId) => setEditor({ roleId, objective: null })}
            />
          ))}

          {isHost ? (
            <div className="flex gap-2">
              <input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                maxLength={80}
                placeholder="Add another role (e.g. Data analyst)"
                className={inputClass}
              />
              <button
                type="button"
                onClick={addRole}
                disabled={busy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-signal/40 hover:text-foreground disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          ) : null}
        </div>

        <aside className="space-y-3">
          <EffortBalance roles={roles} players={state.players} />
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Squad</p>
            <div className="space-y-2">
              {state.players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  role={roles.find((r) => r.owner_player_id === player.id)}
                  isMe={player.id === state.me.id}
                  progress={0}
                  compact
                />
              ))}
            </div>
          </div>
          <div className="panel rounded-xl p-4">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-neon" />
              Before kickoff
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <li>Every role needs an owner.</li>
              <li>Host can still edit missions until the match starts.</li>
              <li>XP only lands after a teammate confirms the proof.</li>
            </ul>
          </div>
        </aside>
      </div>

      <ObjectivesEditor
        code={code}
        token={token}
        roleId={editor?.roleId || ""}
        objective={editor?.objective || null}
        onClose={() => setEditor(null)}
        onDone={refresh}
      />
    </div>
  );
}
