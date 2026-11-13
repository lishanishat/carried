// Demo Mode seed. Everything here is fictional, but it is written to the real
// entities so every later action (accept a tag-in, submit proof, confirm) runs
// through the normal game engine. Server functions only.
import { XP, list, makeCode, makeToken, rebuildSnapshot } from "./game-engine";

export const DEMO_CODE = "DEMO";
const DEMO_CODE_CANDIDATES = [DEMO_CODE, "PLAY", "SHOW", "LIVE"];
export const DEMO_TITLE = "The Final Presentation";
export const DEMO_PLAYER_NAMES = ["Maya", "Kai", "Alex", "Jordan"];

const DEMO_BRIEF =
  "10-minute group presentation on whether the US should accelerate utility-scale solar over offshore wind, delivered to a policy panel. Needs five credible sources, a cost comparison chart, a speaker script under six minutes, and a two-slide appendix for follow-up questions. Due Thursday.";

const DEMO_OVERVIEW =
  "Four players split research, deck, script and ops. Most of the deck is banked — the counterargument brief is mid-handoff and the appendix is waiting on it.";

const ROLES = [
  {
    key: "research",
    title: "Research Lead",
    description: "Source quality and the argument spine.",
    owner: "Maya",
  },
  {
    key: "deck",
    title: "Deck & Visuals",
    description: "Slide structure, charts and the rehearsal cut.",
    owner: "Alex",
  },
  {
    key: "delivery",
    title: "Script & Delivery",
    description: "Speaker script, timing and the appendix.",
    owner: "Jordan",
  },
  {
    key: "ops",
    title: "Sources & Ops",
    description: "Citation cleanup, handout and backups.",
    owner: "Kai",
  },
];

const MISSIONS = [
  {
    key: "m1",
    role: "research",
    owner: "Maya",
    order: 1,
    title: "Source dossier: five credible studies",
    description:
      "Lock the evidence base for the whole argument — five sources the squad can cite out loud without being challenged.",
    acceptance:
      "Five credible sources (peer-reviewed or government) on US renewable policy, each with a working link and a 60-word annotation.",
    effort_points: 130,
    difficulty: "Medium",
    status: "confirmed",
    evidence: {
      text: "Five sources locked and annotated in the shared doc: NREL 2024 Utility-Scale Solar, EIA Electric Power Monthly (Aug), the MIT Energy Initiative storage study, the DOE grid reliability report and Lazard LCOE v17. Each annotation says what the source proves and which slide uses it.",
      reviewer: "Kai",
      explanation: "All five are dated, linked and annotated. Solid base.",
      ai: "Every source is dated and annotated with a slide reference; the acceptance criteria are met.",
    },
  },
  {
    key: "m2",
    role: "research",
    owner: "Maya",
    order: 2,
    title: "Literature matrix: cost vs policy",
    description: "One table so nobody re-argues a point that is already sourced.",
    acceptance:
      "A five-row matrix with claim, evidence type, cost figure and policy relevance columns, plus a three-line summary.",
    effort_points: 70,
    difficulty: "Easy",
    status: "confirmed",
    evidence: {
      text: "Matrix lives in the shared sheet, tab 2. Five rows, four columns, summary at the bottom naming the two strongest cost figures (Lazard and EIA) that the deck should quote on slides 5 and 6.",
      reviewer: "Alex",
      explanation: "Matrix maps cleanly onto the slide claims.",
    },
  },
  {
    key: "m3",
    role: "research",
    owner: "Maya",
    order: 3,
    title: "Counterargument brief: the strongest case against us",
    description:
      "The one question a judge can ask that undoes the whole deck, answered in writing before the presentation.",
    acceptance:
      "Three paragraphs naming the strongest opposing argument with two citations, then answering it in one clear closing line.",
    effort_points: 80,
    difficulty: "Hard",
    status: "tag_in_requested",
    tagIn: {
      finished:
        "Collected four counterargument sources and wrote paragraph one plus the policy critique notes. Links and quotes are in the shared doc under 'Against'.",
      remaining:
        "Two paragraphs left: the cost counterargument (use the Lazard numbers from the matrix) and a one-sentence rebuttal that answers it. Paste the draft as proof when it's done.",
      reason: "I'm out of time before the rehearsal run — baton is yours.",
      links: "Shared doc → 'Against' tab",
    },
  },
  {
    key: "m4",
    role: "deck",
    owner: "Alex",
    order: 4,
    title: "Deck skeleton: 12 slides with titles",
    description: "Every slide gets a job before anyone writes a word of copy.",
    acceptance:
      "A 12-slide outline where each slide has a title, a one-line takeaway and the source it cites.",
    effort_points: 120,
    difficulty: "Medium",
    status: "confirmed",
    evidence: {
      text: "Twelve slides titled and ordered: hook, three evidence slides, cost comparison, counterargument, recommendation, close. Each slide carries a one-line takeaway and a source id from the dossier.",
      reviewer: "Jordan",
      explanation: "Order builds the argument and every slide cites a source.",
      ai: "Outline covers every required section; each slide carries a takeaway and a source.",
    },
  },
  {
    key: "m5",
    role: "deck",
    owner: "Alex",
    order: 5,
    title: "Cost comparison chart: solar vs wind",
    description: "One chart that survives a follow-up question.",
    acceptance:
      "A labelled chart comparing levelised cost for solar and wind across the last five years, with the data source printed on the slide.",
    effort_points: 80,
    difficulty: "Medium",
    status: "confirmed",
    evidence: {
      text: "Chart rebuilt from Lazard v17 on slide 6, 2019–2024, axis labels, source footer and one callout pointing at the 2023 cross-over. Numbers cross-checked twice against the matrix.",
      reviewer: "Maya",
      explanation: "Figures match the dossier and the source footer is on the slide.",
    },
  },
  {
    key: "m6",
    role: "deck",
    owner: "Alex",
    order: 6,
    title: "Rehearsal cut with speaker notes",
    description: "A version the squad can present from, not read off the wall.",
    acceptance: "Speaker notes on all 12 slides, no more than 40 words each.",
    effort_points: 50,
    difficulty: "Easy",
    status: "in_progress",
  },
  {
    key: "m7",
    role: "delivery",
    owner: "Jordan",
    order: 7,
    title: "Speaker script: six-minute cut",
    description: "One continuous script so the team stops talking over each other.",
    acceptance:
      "A 550–650 word script with a named speaker per section and a single hand-off line between speakers.",
    effort_points: 120,
    difficulty: "Medium",
    status: "confirmed",
    evidence: {
      text: "Script is 611 words, split across four speakers with hand-off lines marked in bold. Opens on the hook and ends on the recommendation instead of a thank-you slide.",
      reviewer: "Alex",
      explanation: "Reads at six minutes and every hand-off is explicit.",
      ai: "Word count is in range and every section names a speaker.",
    },
  },
  {
    key: "m8",
    role: "delivery",
    owner: "Jordan",
    order: 8,
    title: "Timing pass: 40 seconds a slide",
    description: "Prove the presentation fits before someone starts cutting live.",
    acceptance:
      "A timed read-through with per-slide durations recorded and anything over 45 seconds flagged.",
    effort_points: 60,
    difficulty: "Easy",
    status: "confirmed",
    evidence: {
      text: "Timed twice (5:48 and 6:12). Slide 6 runs long at 52 seconds and is flagged for a cut; everything else lands inside 40–45.",
      reviewer: "Kai",
      explanation: "Timings recorded and the long slide is flagged.",
    },
  },
  {
    key: "m9",
    role: "delivery",
    owner: "Jordan",
    order: 9,
    title: "Appendix: final recommendations",
    description: "The two extra slides for the panel's follow-up questions.",
    acceptance:
      "Two appendix slides listing three recommendations, each mapped to the evidence that supports it.",
    effort_points: 70,
    difficulty: "Medium",
    status: "blocked",
    blocked: {
      reason:
        "Waiting on the counterargument brief so the appendix answers the strongest objection first.",
      on: "m3",
    },
  },
  {
    key: "m10",
    role: "ops",
    owner: "Kai",
    order: 10,
    title: "Citation cleanup in the bibliography",
    description: "One style, no dead links, nothing the panel can trip over.",
    acceptance:
      "Every citation on every slide uses the same style and resolves to a working link.",
    effort_points: 90,
    difficulty: "Easy",
    status: "confirmed",
    evidence: {
      text: "Bibliography normalised to APA, 14 entries, all links re-checked. Removed two duplicates and replaced the dead DOE link with the 2024 edition.",
      reviewer: "Maya",
      explanation: "All 14 entries resolve and the style is consistent.",
    },
  },
  {
    key: "m11",
    role: "ops",
    owner: "Kai",
    order: 11,
    title: "One-page handout",
    description: "Something the panel keeps after you leave the room.",
    acceptance:
      "A single-page PDF with the thesis, the cost chart and the three recommendations.",
    effort_points: 80,
    difficulty: "Medium",
    status: "in_progress",
  },
  {
    key: "m12",
    role: "ops",
    owner: "Kai",
    order: 12,
    title: "Backup files and offline copy",
    description: "The presentation has to survive bad conference wifi.",
    acceptance:
      "PDF and source file exported, downloaded to two devices, and a copy stored in the shared folder.",
    effort_points: 50,
    difficulty: "Easy",
    status: "available",
  },
];

const hours = (n) => n * 3600 * 1000;

/* ------------------------------------------------------------------ players */

export async function ensureDemoPlayers(sdk, match) {
  const s = sdk.asServiceRole;
  const existing = await list(s.entities.Player.filter({ match_id: match.id }));
  const byName = {};
  existing.forEach((p) => {
    byName[p.display_name] = p;
  });

  const missing = DEMO_PLAYER_NAMES.filter((name) => !byName[name]);
  if (!missing.length) {
    return { match, players: DEMO_PLAYER_NAMES.map((name) => byName[name]) };
  }

  const tokens = { ...(match.member_tokens || {}) };
  for (const name of missing) {
    const token = makeToken();
    const player = await s.entities.Player.create({
      match_id: match.id,
      display_name: name,
      participant_token: token,
      is_host: name === DEMO_PLAYER_NAMES[0],
      joined_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    });
    byName[name] = player;
    tokens[player.id] = token;
  }

  const players = DEMO_PLAYER_NAMES.map((name) => byName[name]);
  const updated = await s.entities.Match.update(match.id, {
    member_tokens: tokens,
    host_player_id: players[0].id,
  });
  return { match: updated, players };
}

/* --------------------------------------------------------------------- seed */

async function freeDemoCode(sdk) {
  const existing = await list(sdk.asServiceRole.entities.Match.filter({}));
  const taken = new Set(existing.map((m) => m.join_code));
  const free = DEMO_CODE_CANDIDATES.find((code) => !taken.has(code));
  return free || makeCode();
}

export async function createDemoMatch(sdk) {
  const s = sdk.asServiceRole;
  const now = Date.now();
  const code = await freeDemoCode(sdk);
  return s.entities.Match.create({
    join_code: code,
    title: DEMO_TITLE,
    brief: DEMO_BRIEF,
    overview: DEMO_OVERVIEW,
    deadline: new Date(now + hours(26)).toISOString(),
    status: "live",
    team_size: 4,
    settings: { caster: true, xp: XP },
    member_tokens: {},
    state_cache: null,
    is_demo: true,
    demo_owner_token: makeToken(),
  });
}

async function clearDemoData(s, matchId) {
  await s.entities.Review.deleteMany({ match_id: matchId });
  await s.entities.Evidence.deleteMany({ match_id: matchId });
  await s.entities.ContributionEvent.deleteMany({ match_id: matchId });
  await s.entities.MatchEvent.deleteMany({ match_id: matchId });
  await s.entities.Dependency.deleteMany({ match_id: matchId });
  await s.entities.TagInRequest.deleteMany({ match_id: matchId });
  await s.entities.RescueRequest.deleteMany({ match_id: matchId });
  await s.entities.Objective.deleteMany({ match_id: matchId });
  await s.entities.Role.deleteMany({ match_id: matchId });
}

export async function plantDemo(sdk, match, players) {
  const s = sdk.asServiceRole;
  const now = Date.now();
  const byName = {};
  players.forEach((p) => {
    byName[p.display_name] = p;
  });

  await clearDemoData(s, match.id);

  // Batched writes: one seeding pass must stay well inside the entity limits
  // so a judge can reset the demo more than once.
  const roleRecords = await s.entities.Role.bulkCreate(
    ROLES.map((role, index) => ({
      match_id: match.id,
      title: role.title,
      description: role.description,
      order: index,
      estimated_effort: MISSIONS.filter((m) => m.role === role.key).reduce(
        (sum, m) => sum + m.effort_points,
        0
      ),
      locked: true,
      owner_player_id: byName[role.owner]?.id || "",
    }))
  );
  const roleByKey = {};
  ROLES.forEach((role, index) => {
    roleByKey[role.key] = roleRecords[index];
  });

  const objectiveRecords = await s.entities.Objective.bulkCreate(
    MISSIONS.map((mission) => {
      const submittedAt = new Date(now - hours(24 - mission.order)).toISOString();
      return {
        match_id: match.id,
        role_id: roleByKey[mission.role].id,
        owner_id: byName[mission.owner]?.id || "",
        title: mission.title,
        description: mission.description,
        acceptance_criteria: mission.acceptance,
        effort_points: mission.effort_points,
        difficulty: mission.difficulty,
        status: mission.status,
        order: mission.order,
        deadline: new Date(now + hours(10 + mission.order)).toISOString(),
        blocked_reason: mission.blocked?.reason || "",
        blocked_on_objective_id: "",
        previous_owner_ids: [],
        submitted_at: mission.evidence ? submittedAt : "",
        confirmed_at: mission.status === "confirmed" ? submittedAt : "",
      };
    })
  );
  const objectiveByKey = {};
  MISSIONS.forEach((mission, index) => {
    objectiveByKey[mission.key] = objectiveRecords[index];
  });

  const blocked = MISSIONS.filter((m) => m.blocked);
  if (blocked.length) {
    await s.entities.Dependency.bulkCreate(
      blocked.map((m) => ({
        match_id: match.id,
        objective_id: objectiveByKey[m.key].id,
        prerequisite_objective_id: objectiveByKey[m.blocked.on].id,
      }))
    );
    await s.entities.Objective.bulkUpdate(
      blocked.map((m) => ({
        id: objectiveByKey[m.key].id,
        blocked_on_objective_id: objectiveByKey[m.blocked.on].id,
      }))
    );
  }

  const roleClaims = ROLES.filter((role) => byName[role.owner]).map((role) => ({
    id: byName[role.owner].id,
    role_id: roleByKey[role.key].id,
  }));
  if (roleClaims.length) await s.entities.Player.bulkUpdate(roleClaims);

  // Verified history: evidence, reviews and the XP that comes with it.
  const withEvidence = MISSIONS.filter((m) => m.evidence);
  const evidenceRecords = await s.entities.Evidence.bulkCreate(
    withEvidence.map((mission) => ({
      match_id: match.id,
      objective_id: objectiveByKey[mission.key].id,
      submitted_by: byName[mission.owner].id,
      text: mission.evidence.text,
      resource_reference: "",
      file_uri: "",
      review_status: "confirmed",
      submitted_at: new Date(now - hours(24 - mission.order)).toISOString(),
    }))
  );

  const reviews = [];
  withEvidence.forEach((mission, index) => {
    const objective = objectiveByKey[mission.key];
    const evidence = evidenceRecords[index];
    if (mission.evidence.ai) {
      reviews.push({
        match_id: match.id,
        evidence_id: evidence.id,
        objective_id: objective.id,
        reviewer_id: "ai",
        reviewer_name: "VAR Referee",
        recommendation: "CONFIRMED",
        explanation: mission.evidence.ai,
        requirements_met: [],
        requirements_missing: [],
        confidence: 0.86,
        is_ai: true,
      });
    }
    const reviewer = byName[mission.evidence.reviewer];
    if (reviewer) {
      reviews.push({
        match_id: match.id,
        evidence_id: evidence.id,
        objective_id: objective.id,
        reviewer_id: reviewer.id,
        reviewer_name: reviewer.display_name,
        recommendation: "CONFIRMED",
        explanation: mission.evidence.explanation,
        requirements_met: [],
        requirements_missing: [],
        confidence: 1,
        is_ai: false,
      });
    }
  });
  if (reviews.length) await s.entities.Review.bulkCreate(reviews);

  await s.entities.ContributionEvent.bulkCreate(
    withEvidence.map((mission) => ({
      match_id: match.id,
      objective_id: objectiveByKey[mission.key].id,
      player_id: byName[mission.owner].id,
      event_type: "objective_confirmed",
      verified_points: mission.effort_points,
      note: mission.title,
      dedupe_key: `objective_confirmed:${objectiveByKey[mission.key].id}:${byName[mission.owner].id}`,
    }))
  );

  // The handoff the whole demo is built around.
  const handoffMission = MISSIONS.find((m) => m.tagIn);
  const handoffObjective = objectiveByKey[handoffMission.key];
  const maya = byName[handoffMission.owner];
  await s.entities.TagInRequest.bulkCreate([
    {
      match_id: match.id,
      objective_id: handoffObjective.id,
      original_owner_id: maya.id,
      finished_work: handoffMission.tagIn.finished,
      remaining_work: handoffMission.tagIn.remaining,
      resource_links: handoffMission.tagIn.links,
      reason: handoffMission.tagIn.reason,
      status: "open",
      requested_at: new Date(now - 30 * 60 * 1000).toISOString(),
    },
  ]);

  /* Feed history — small batches so the newest event still lands on top. */
  const eventRow = (row) => ({
    match_id: match.id,
    event_type: row.type,
    actor_id: byName[row.actor]?.id || "",
    actor_name: byName[row.actor]?.display_name || "",
    related_player_ids: [],
    metadata: { ...(row.metadata || {}), objective_id: row.objective?.id || "" },
    caster_text: row.caster,
  });

  const confirmedMissions = MISSIONS.filter((m) => m.status === "confirmed");

  await s.entities.MatchEvent.bulkCreate([
    eventRow({
      type: "match_started",
      actor: "Maya",
      caster: "THE MATCH IS LIVE! FOUR PLAYERS, ONE PRESENTATION!",
    }),
  ]);
  await s.entities.MatchEvent.bulkCreate(
    ROLES.map((role) =>
      eventRow({
        type: "role_locked",
        actor: role.owner,
        caster: `${role.owner.toUpperCase()} LOCKS IN ${role.title.toUpperCase()}!`,
      })
    )
  );
  await s.entities.MatchEvent.bulkCreate(
    confirmedMissions.map((mission) =>
      eventRow({
        type: "objective_confirmed",
        actor: mission.owner,
        objective: objectiveByKey[mission.key],
        metadata: { points: mission.effort_points },
        caster: `${mission.owner.toUpperCase()} BANKS ${mission.effort_points} XP! ABSOLUTE CINEMA!`,
      })
    )
  );
  await s.entities.MatchEvent.bulkCreate([
    eventRow({
      type: "tagin_requested",
      actor: handoffMission.owner,
      objective: handoffObjective,
      caster: `${handoffMission.owner.toUpperCase()} CALLS FOR A TAG! WHO'S TAKING THE BATON?`,
    }),
  ]);

  await s.entities.Match.update(match.id, {
    title: DEMO_TITLE,
    brief: DEMO_BRIEF,
    overview: DEMO_OVERVIEW,
    deadline: new Date(now + hours(26)).toISOString(),
    status: "live",
    team_size: 4,
    started_at: new Date(now - hours(6)).toISOString(),
    ended_at: "",
    summary: null,
    final_boss_active: false,
    settings: {
      ...(match.settings || {}),
      caster: true,
      xp: XP,
      demo_seeded_at: new Date(now).toISOString(),
    },
    is_demo: true,
  });

  await rebuildSnapshot(sdk, match.id);
  return { objectives: objectiveRecords.length };
}

export async function ensureDemoMatch(sdk) {
  const s = sdk.asServiceRole;
  // Match on the demo flag only — a real user match must never be touched, even
  // if it happens to hold the same join code.
  const demos = await list(s.entities.Match.filter({ is_demo: true }));
  let match = demos[0];

  if (!match) {
    match = await createDemoMatch(sdk);
    const ensured = await ensureDemoPlayers(sdk, match);
    await plantDemo(sdk, ensured.match, ensured.players);
    return ensured;
  }

  const ensured = await ensureDemoPlayers(sdk, match);
  const seededAt = new Date(ensured.match.settings?.demo_seeded_at || 0).getTime();
  const stale = !seededAt || Date.now() - seededAt > 30 * 60 * 1000;
  // Resume a demo that is still running; refresh one that was played out or left behind.
  if (ensured.match.status !== "live" || !ensured.match.state_cache || stale) {
    await plantDemo(sdk, ensured.match, ensured.players);
  }
  return ensured;
}
