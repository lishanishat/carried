// Shared game engine: identity, scoring, caster, health, snapshot state.
// Only ever executed inside server functions (invoked from a server handler).
import { XP } from "./xp.js";

export { XP };

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function makeCode() {
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function makeToken() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return `${c.randomUUID()}${c.randomUUID()}`.replace(/-/g, "");
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function fail(message) {
  const err = new Error(message);
  err.expose = true;
  throw err;
}

/** Normalises SDK list results (array or paginated page). */
export async function list(promise) {
  const res = await promise;
  if (Array.isArray(res)) return res;
  return res?.items || [];
}

export async function getMatchByCode(sdk, code) {
  const clean = String(code || "").trim().toUpperCase();
  if (clean.length !== 4) fail("Enter the four-letter match code.");
  const matches = await list(sdk.asServiceRole.entities.Match.filter({ join_code: clean }));
  if (!matches.length) fail("No match found with that code.");
  return matches[0];
}

/**
 * One cheap read: the match record carries the member tokens and the snapshot,
 * so a caller is authenticated and served without touching other entities.
 */
export async function authMatch(sdk, code, token) {
  const match = await getMatchByCode(sdk, code);
  const tokens = match.member_tokens || {};
  const entry = Object.entries(tokens).find(([, value]) => value === String(token || ""));
  if (!entry) fail("You are not in this match. Join with the match code.");
  const playerId = entry[0];
  const cached = (match.state_cache?.players || []).find((p) => p.id === playerId) || {};
  return {
    match,
    me: {
      id: playerId,
      display_name: cached.name || "",
      role_id: cached.role_id || "",
    },
  };
}

export function assertHost(match, me) {
  if (match.host_player_id !== me.id) fail("Only the host can do that.");
}

/* ------------------------------------------------------------------ scoring */

export async function awardPoints(
  sdk,
  { matchId, objectiveId = "", playerId, eventType, points, note = "", keySuffix = "" }
) {
  if (!points || points <= 0) return null;
  const dedupeKey = [eventType, objectiveId || "match", playerId, keySuffix]
    .filter(Boolean)
    .join(":");
  const existing = await list(
    sdk.asServiceRole.entities.ContributionEvent.filter({
      match_id: matchId,
      dedupe_key: dedupeKey,
    })
  );
  if (existing.length) return null;
  const created = await sdk.asServiceRole.entities.ContributionEvent.create({
    match_id: matchId,
    objective_id: objectiveId || "",
    player_id: playerId,
    event_type: eventType,
    verified_points: points,
    note,
    dedupe_key: dedupeKey,
  });
  return { ...created, dedupe_key: dedupeKey };
}

/* ------------------------------------------------------------------- caster */

const CASTER_VOICE =
  "You are the CARRIED match commentator: loud, fast, playful, slightly ridiculous esports energy. " +
  "One line only. Maximum 15 words. ALL CAPS. Never insult or shame anyone, never mention lateness, " +
  "delays or asking for help as a weakness. No quotes, no emoji, no hashtags.";

const FALLBACKS = {
  player_joined: (c) => `${c.name} ENTERS THE ARENA! THE SQUAD IS ASSEMBLING!`,
  role_locked: (c) => `${c.name} LOCKS IN ${c.role || "THEIR ROLE"}! COMMITMENT MAXIMUM!`,
  match_started: () => "THE MATCH IS LIVE! MISSIONS ARE ON THE BOARD!",
  objective_started: (c) => `${c.name} IS IN MOTION ON ${c.mission}!`,
  proof_submitted: (c) => `${c.name} SENDS IT TO VAR! THE CROWD GOES QUIET!`,
  objective_confirmed: (c) => `${c.name} JUST BANKED ${c.points} XP! ABSOLUTE CINEMA!`,
  objective_rejected: () => "VAR SAYS NO! THAT MISSION NEEDS ANOTHER ROUND!",
  rescue_requested: (c) => `${c.name} CALLS FOR BACKUP! SOMEBODY ANSWER THAT!`,
  rescue_volunteered: (c) => `${c.name} SLIDES IN FOR THE RESCUE! WHAT A TEAMMATE!`,
  rescue_completed: (c) => `DOUBLE ASSIST! ${c.name} WITH THE SAVE!`,
  tagin_requested: (c) => `${c.name} CALLS FOR A TAG! WHO'S TAKING THE BATON?`,
  tagin_accepted: (c) => `${c.name} WITH THE SETUP! ${c.other} TAGS IN FOR THE FINISH!`,
  tagin_cancelled: (c) => `${c.name} KEEPS THE BATON! PLOT TWIST!`,
  dependency_cleared: () => "CRITICAL PATH CLEARED! THE WHOLE SQUAD IS BACK IN BUSINESS!",
  milestone: (c) => `${c.percent}% OF THE PROJECT IS LOCKED IN! KEEP PUSHING!`,
  boss_activated: () => "THE FINAL BOSS AWAKENS! EVERY MISSION COUNTS NOW!",
  match_finished: () => "THAT'S THE MATCH! WHAT A RUN FROM THIS SQUAD!",
};

export function fallbackCaster(eventType, ctx = {}) {
  const fn = FALLBACKS[eventType];
  return fn ? fn(ctx) : `${ctx.name || "THE SQUAD"} MAKES A MOVE!`;
}

export async function casterLine(sdk, { eventType, context = "", ctx = {} }) {
  const fallback = fallbackCaster(eventType, ctx);
  try {
    const raw = await sdk.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${CASTER_VOICE}\n\nEvent: ${eventType}\nWhat happened: ${context}\n\nWrite the one line.`,
    });
    const line = String(raw || "")
      .replace(/^["'`\s]+|["'`\s]+$/g, "")
      .trim();
    if (!line) return fallback;
    if (line.split(/\s+/).length > 18) return fallback;
    return line.toUpperCase();
  } catch {
    return fallback;
  }
}

export async function logEvent(
  sdk,
  { match, me, eventType, relatedPlayerIds = [], metadata = {}, context = "", ctx = {} }
) {
  const casterOn = match.settings?.caster !== false;
  const caster_text = casterOn
    ? await casterLine(sdk, { eventType, context, ctx: { name: me?.display_name, ...ctx } })
    : "";
  const created = await sdk.asServiceRole.entities.MatchEvent.create({
    match_id: match.id,
    event_type: eventType,
    actor_id: me?.id || "",
    actor_name: me?.display_name || "",
    related_player_ids: relatedPlayerIds,
    metadata,
    caster_text,
  });
  return slimEvent(created);
}

export function slimEvent(event) {
  return {
    id: event.id,
    type: event.event_type || event.type,
    actor_id: event.actor_id || "",
    actor_name: event.actor_name || "",
    metadata: event.metadata || {},
    caster_text: event.caster_text || "",
    created_date: event.created_date || new Date().toISOString(),
  };
}

/* -------------------------------------------------------------- team health */

export function computeHealth(match, objectives = [], now = Date.now()) {
  const totalPoints = objectives.reduce((s, o) => s + (o.effort_points || 0), 0) || 1;
  const confirmedPoints = objectives
    .filter((o) => o.status === "confirmed")
    .reduce((s, o) => s + (o.effort_points || 0), 0);
  const completion = Math.round((confirmedPoints / totalPoints) * 100);

  const blocked = objectives.filter((o) => o.status === "blocked").length;
  const overdue = objectives.filter(
    (o) => o.status !== "confirmed" && o.deadline && new Date(o.deadline).getTime() < now
  ).length;
  const msLeft = match?.deadline ? new Date(match.deadline).getTime() - now : null;
  const hoursLeft = msLeft === null ? null : msLeft / 3600000;

  const reasons = [];
  let score = 100;

  const workGap = Math.round((1 - confirmedPoints / totalPoints) * 35);
  const remainingPct = Math.round((1 - confirmedPoints / totalPoints) * 100);
  score -= workGap;
  if (workGap > 12) reasons.push(`${remainingPct}% of the required effort is still open.`);

  if (overdue > 0) {
    score -= Math.min(20, overdue * 6);
    reasons.push(`${overdue} mission${overdue > 1 ? "s" : ""} past its target date.`);
  }
  if (blocked > 0) {
    score -= Math.min(15, blocked * 5);
    reasons.push(`${blocked} mission${blocked > 1 ? "s" : ""} currently blocked.`);
  }
  if (hoursLeft !== null && hoursLeft < 0) {
    score -= 25;
    reasons.push("The deadline has passed.");
  } else if (hoursLeft !== null && hoursLeft < 24) {
    score -= 12;
    reasons.push("Less than a day until the deadline.");
  } else if (hoursLeft !== null && hoursLeft < 72) {
    score -= 5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (!reasons.length) reasons.push("On track — no blockers, no overdue missions.");

  return {
    score,
    completion,
    total_points: totalPoints,
    confirmed_points: confirmedPoints,
    overdue,
    blocked,
    hours_left: hoursLeft === null ? null : Math.round(hoursLeft),
    reasons,
  };
}

/* -------------------------------------------------------------------- stats */

export function computeStats(players, contributions = []) {
  const stats = {};
  players.forEach((p) => {
    stats[p.id] = { xp: 0, confirmed: 0, rescues: 0, tagIns: 0, handoffs: 0, reviews: 0, assists: 0 };
  });
  contributions.forEach((c) => {
    const s = stats[c.player_id];
    if (!s) return;
    s.xp += c.verified_points || 0;
    if (c.event_type === "objective_confirmed") s.confirmed += 1;
    if (c.event_type === "rescue_assist") {
      s.rescues += 1;
      s.assists += 1;
    }
    if (c.event_type === "tagin_assist") {
      s.tagIns += 1;
      s.assists += 1;
    }
    if (c.event_type === "clean_handoff") s.handoffs += 1;
    if (c.event_type === "review_help") s.reviews += 1;
  });
  return stats;
}

/* ------------------------------------------------------------------- awards */

export const AWARD_TITLE = {
  mvp: "MVP",
  clutch: "THE CLUTCH PLAYER",
  relay: "RELAY LEGEND",
  support: "BEST SUPPORT",
  finisher: "THE FINISHER",
  unblocker: "THE UNBLOCKER",
};

export const AWARD_CRITERIA = {
  mvp: "Highest verified XP",
  clutch: "Most rescues delivered",
  relay: "Most tagged-in missions finished",
  support: "Most assists (rescues, tag-ins, reviews)",
  finisher: "Most confirmed missions",
  unblocker: "Cleared the most missions others were waiting on",
};

export const AWARD_FALLBACK = {
  mvp: "Top of the scoreboard, top of the lobby — the whole run went through them.",
  clutch: "Called in when the squad was stuck and turned a blocker into a win.",
  relay: "Took the baton mid-race and crossed the line anyway.",
  support: "The assist machine: rescues, tag-ins and clean review calls on repeat.",
  finisher: "Started missions and actually ended them. Rare talent.",
  unblocker: "Pulled the chain out of the critical path so everyone else could move.",
};

export function awardPool(state) {
  const players = state.players;
  const objectives = state.objectives;
  const deps = state.dependencies;

  const unblockCount = {};
  deps.forEach((d) => {
    const target = objectives.find((o) => o.id === d.objective_id);
    const prereq = objectives.find((o) => o.id === d.prerequisite_objective_id);
    if (
      target &&
      prereq &&
      target.status === "confirmed" &&
      prereq.status === "confirmed" &&
      prereq.owner_id
    ) {
      unblockCount[prereq.owner_id] = (unblockCount[prereq.owner_id] || 0) + 1;
    }
  });

  const candidates = players.map((p) => ({
    player_id: p.id,
    name: p.name,
    xp: p.stats.xp || 0,
    confirmed: p.stats.confirmed || 0,
    rescues: p.stats.rescues || 0,
    tagIns: p.stats.tagIns || 0,
    assists: p.stats.assists || 0,
    reviews: p.stats.reviews || 0,
    unblocked: unblockCount[p.id] || 0,
  }));

  const best = (key) => {
    const sorted = candidates.slice().sort((a, b) => b[key] - a[key]);
    if (!sorted.length || sorted[0][key] <= 0) return null;
    return sorted[0];
  };

  const pool = [
    { key: "mvp", holder: best("xp") },
    { key: "clutch", holder: best("rescues") },
    { key: "relay", holder: best("tagIns") },
    { key: "support", holder: best("assists") },
    { key: "finisher", holder: best("confirmed") },
    { key: "unblocker", holder: best("unblocked") },
  ].filter((a) => a.holder);

  const awards = [];
  const usedPlayers = new Set();
  for (const award of pool) {
    if (awards.length >= 3) break;
    if (usedPlayers.has(award.holder.player_id)) continue;
    awards.push(award);
    usedPlayers.add(award.holder.player_id);
  }
  for (const award of pool) {
    if (awards.length >= 3) break;
    if (!awards.some((a) => a.key === award.key)) awards.push(award);
  }

  return { candidates, pool, awards };
}

export function buildMatchSummary({ state, match, descriptions = {} }) {
  const { candidates, awards } = awardPool(state);
  return {
    completion: state.health.completion,
    total_confirmed_points: state.health.confirmed_points,
    total_points: state.health.total_points,
    team_health: state.health.score,
    ended_at: new Date().toISOString(),
    started_at: match.started_at || "",
    leaderboard: candidates.slice().sort((a, b) => b.xp - a.xp),
    mvp: candidates.slice().sort((a, b) => b.xp - a.xp)[0] || null,
    awards: awards.map((a) => ({
      key: a.key,
      title: AWARD_TITLE[a.key],
      criteria: AWARD_CRITERIA[a.key],
      player_id: a.holder.player_id,
      name: a.holder.name,
      stat: a.holder,
      description: descriptions[a.key] || AWARD_FALLBACK[a.key],
    })),
    unfinished: state.objectives
      .filter((o) => o.status !== "confirmed")
      .map((o) => ({
        id: o.id,
        title: o.title,
        status: o.status,
        effort_points: o.effort_points,
        owner_id: o.owner_id,
      })),
  };
}

/* -------------------------------------------------------------------- state */

export function emptyState(match) {
  return {
    match: {
      id: match.id,
      code: match.join_code,
      title: match.title,
      brief: match.brief || "",
      overview: match.overview || "",
      deadline: match.deadline || "",
      status: match.status,
      team_size: match.team_size || 3,
      host_player_id: match.host_player_id || "",
      settings: match.settings || {},
      final_boss_active: !!match.final_boss_active,
      started_at: match.started_at || "",
      ended_at: match.ended_at || "",
      summary: match.summary || null,
      is_demo: !!match.is_demo,
    },
    players: [],
    roles: [],
    objectives: [],
    dependencies: [],
    rescues: [],
    tagIns: [],
    events: [],
    contributions: [],
    health: computeHealth(match, []),
  };
}

/** Recomputes derived values (XP, stats, health) from the arrays in the snapshot. */
export function finalizeState(state) {
  const stats = computeStats(state.players, state.contributions);
  state.players = state.players.map((p) => ({
    ...p,
    xp: stats[p.id]?.xp || 0,
    stats:
      stats[p.id] ||
      { xp: 0, confirmed: 0, rescues: 0, tagIns: 0, handoffs: 0, reviews: 0, assists: 0 },
  }));
  state.health = computeHealth(state.match, state.objectives);
  return state;
}

async function readAll(sdk, matchId) {
  const s = sdk.asServiceRole;
  const [
    players,
    roles,
    objectives,
    dependencies,
    rescues,
    tagIns,
    contributions,
    events,
    evidence,
    reviews,
  ] = await Promise.all([
    list(s.entities.Player.filter({ match_id: matchId })),
    list(s.entities.Role.filter({ match_id: matchId })),
    list(s.entities.Objective.filter({ match_id: matchId })),
    list(s.entities.Dependency.filter({ match_id: matchId })),
    list(s.entities.RescueRequest.filter({ match_id: matchId })),
    list(s.entities.TagInRequest.filter({ match_id: matchId })),
    list(s.entities.ContributionEvent.filter({ match_id: matchId })),
    list(s.entities.MatchEvent.filter({ match_id: matchId }, { sort: "-created_date", limit: 60 })),
    list(s.entities.Evidence.filter({ match_id: matchId })),
    list(s.entities.Review.filter({ match_id: matchId })),
  ]);
  return {
    players,
    roles,
    objectives,
    dependencies,
    rescues,
    tagIns,
    contributions,
    events,
    evidence,
    reviews,
  };
}

/** Full rebuild from the database — used for structural changes only. */
export async function rebuildSnapshot(sdk, matchId) {
  const s = sdk.asServiceRole;
  const match = await s.entities.Match.get(matchId);
  const data = await readAll(sdk, matchId);
  const state = emptyState(match);

  const reviewsByEvidence = {};
  data.reviews
    .slice()
    .sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)))
    .forEach((r) => {
      reviewsByEvidence[r.evidence_id] = reviewsByEvidence[r.evidence_id] || [];
      reviewsByEvidence[r.evidence_id].push(r);
    });

  const evidenceByObjective = {};
  data.evidence
    .slice()
    .sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)))
    .forEach((e) => {
      evidenceByObjective[e.objective_id] = evidenceByObjective[e.objective_id] || [];
      evidenceByObjective[e.objective_id].push({ ...e, reviews: reviewsByEvidence[e.id] || [] });
    });

  const byOrder = (a, b) => (a.order || 0) - (b.order || 0);

  state.players = data.players
    .slice()
    .sort((a, b) => String(a.joined_at || "").localeCompare(String(b.joined_at || "")))
    .map((p) => ({
      id: p.id,
      name: p.display_name,
      role_id: p.role_id || "",
      is_host: p.is_host || p.id === match.host_player_id,
      joined_at: p.joined_at || "",
      last_seen: p.last_seen || "",
    }));

  state.roles = data.roles
    .slice()
    .sort(byOrder)
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || "",
      estimated_effort: r.estimated_effort || 0,
      owner_player_id: r.owner_player_id || "",
      locked: !!r.locked,
      order: r.order || 0,
    }));

  state.objectives = data.objectives
    .slice()
    .sort(byOrder)
    .map((o) => ({
      id: o.id,
      role_id: o.role_id || "",
      owner_id: o.owner_id || "",
      title: o.title,
      description: o.description || "",
      acceptance_criteria: o.acceptance_criteria || "",
      effort_points: o.effort_points || 0,
      difficulty: o.difficulty || "Medium",
      status: o.status || "available",
      deadline: o.deadline || "",
      order: o.order || 0,
      blocked_reason: o.blocked_reason || "",
      blocked_on_objective_id: o.blocked_on_objective_id || "",
      previous_owner_ids: o.previous_owner_ids || [],
      submitted_at: o.submitted_at || "",
      confirmed_at: o.confirmed_at || "",
      evidence: evidenceByObjective[o.id] || [],
    }));

  state.dependencies = data.dependencies.map((d) => ({
    id: d.id,
    objective_id: d.objective_id,
    prerequisite_objective_id: d.prerequisite_objective_id,
  }));

  state.rescues = data.rescues
    .slice()
    .sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)))
    .map((r) => ({
      id: r.id,
      objective_id: r.objective_id,
      requested_by: r.requested_by,
      blocker: r.blocker || "",
      requested_help: r.requested_help || "",
      relevant_links: r.relevant_links || "",
      retain_responsibility: r.retain_responsibility !== false,
      helper_id: r.helper_id || "",
      status: r.status || "open",
      resolved_at: r.resolved_at || "",
      created_date: r.created_date,
    }));

  state.tagIns = data.tagIns
    .slice()
    .sort((a, b) =>
      String(b.requested_at || b.created_date).localeCompare(
        String(a.requested_at || a.created_date)
      )
    )
    .map((t) => ({
      id: t.id,
      objective_id: t.objective_id,
      original_owner_id: t.original_owner_id,
      accepting_owner_id: t.accepting_owner_id || "",
      finished_work: t.finished_work || "",
      remaining_work: t.remaining_work || "",
      resource_links: t.resource_links || "",
      reason: t.reason || "",
      status: t.status || "open",
      requested_at: t.requested_at || t.created_date,
      accepted_at: t.accepted_at || "",
    }));

  state.contributions = data.contributions.map((c) => ({
    id: c.id,
    player_id: c.player_id,
    objective_id: c.objective_id,
    event_type: c.event_type,
    verified_points: c.verified_points || 0,
    note: c.note || "",
    created_date: c.created_date,
  }));

  state.events = data.events.slice(0, 40).map(slimEvent);
  state.match.summary = match.summary || null;

  finalizeState(state);
  await s.entities.Match.update(matchId, { state_cache: state });
  return state;
}

/**
 * Applies an in-memory patch to the cached snapshot and saves it.
 * Costs one read + one write, no list calls.
 */
export async function patchState(sdk, matchId, patcher) {
  const s = sdk.asServiceRole;
  const match = await s.entities.Match.get(matchId);
  const state = match.state_cache || emptyState(match);
  const next = patcher(state) || state;
  finalizeState(next);
  await s.entities.Match.update(matchId, { state_cache: next });
  return next;
}

/** One read: authenticated state straight from the snapshot. */
export async function readState(sdk, code, token) {
  const { match, me } = await authMatch(sdk, code, token);
  let state = match.state_cache;
  if (!state || !state.objectives) {
    state = await rebuildSnapshot(sdk, match.id);
  }
  const cached = (state.players || []).find((p) => p.id === me.id) || {};
  return {
    match,
    player: me,
    state: {
      ...state,
      me: {
        id: me.id,
        name: cached.name || me.display_name,
        is_host: state.match.host_player_id === me.id,
      },
    },
  };
}

/* -------------------------------------------------------- snapshot utilities */

export function patchObjective(state, objectiveId, changes) {
  state.objectives = state.objectives.map((o) => (o.id === objectiveId ? { ...o, ...changes } : o));
}

export function pushEvent(state, event) {
  if (!event) return;
  state.events = [slimEvent(event), ...(state.events || [])].slice(0, 40);
}

export function pushContribution(state, contribution) {
  if (!contribution) return;
  state.contributions = [...(state.contributions || []), contribution];
}

export function patchRescue(state, rescueId, changes) {
  state.rescues = state.rescues.map((r) => (r.id === rescueId ? { ...r, ...changes } : r));
}

export function patchTagIn(state, tagInId, changes) {
  state.tagIns = state.tagIns.map((t) => (t.id === tagInId ? { ...t, ...changes } : t));
}

export function patchEvidence(state, objectiveId, evidence) {
  state.objectives = state.objectives.map((o) =>
    o.id === objectiveId ? { ...o, evidence: [evidence, ...(o.evidence || [])] } : o
  );
}
