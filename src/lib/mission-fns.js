import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  assertHost,
  authMatch,
  awardPoints,
  awardPool,
  buildMatchSummary,
  AWARD_CRITERIA,
  AWARD_TITLE,
  fail,
  list,
  logEvent,
  patchEvidence,
  patchObjective,
  patchRescue,
  patchState,
  patchTagIn,
  pushContribution,
  pushEvent,
  rebuildSnapshot,
} from "./game-engine";
import { XP } from "./xp";

function guarded(handler) {
  return async (args) => {
    try {
      return { ok: true, ...(await handler(args)) };
    } catch (e) {
      return { ok: false, error: e?.message || "Something went wrong." };
    }
  };
}

const creds = z.object({
  code: z.string().trim().toUpperCase(),
  token: z.string().min(1),
});

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["CONFIRMED", "NEEDS_REVISION", "INSUFFICIENT_EVIDENCE"] },
    reason: { type: "string" },
    requirements_met: { type: "array", items: { type: "string" } },
    requirements_missing: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
  required: ["decision", "reason", "requirements_met", "requirements_missing", "confidence"],
};

async function loadObjective(s, id, matchId) {
  const objective = await s.entities.Objective.get(id);
  if (!objective || objective.match_id !== matchId) fail("That mission isn't in this match.");
  return objective;
}

async function dependentsOf(s, matchId, objectiveId) {
  const deps = await list(
    s.entities.Dependency.filter({ match_id: matchId, prerequisite_objective_id: objectiveId })
  );
  return deps;
}

/* ---------------------------------------------------------- demo fast-forward */

// Demo matches only: the squad confirms the hand-in and the match wraps up, so a
// single "Submit proof" click lands the judge on the final screen.
async function autoCompleteDemo(sdk, { match, me, objective, evidence }) {
  const s = sdk.asServiceRole;
  const players = await list(s.entities.Player.filter({ match_id: match.id }));
  const reviewer = players.find((p) => p.id !== me.id) || me;

  await s.entities.Review.create({
    match_id: match.id,
    evidence_id: evidence.id,
    objective_id: objective.id,
    reviewer_id: reviewer.id,
    reviewer_name: reviewer.display_name,
    recommendation: "CONFIRMED",
    explanation: `Demo mode: ${reviewer.display_name} auto-approved the hand-in.`,
    requirements_met: [],
    requirements_missing: [],
    confidence: 1,
    is_ai: false,
  });

  await s.entities.Evidence.update(evidence.id, { review_status: "confirmed" });
  await s.entities.Objective.update(objective.id, {
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
    blocked_reason: "",
    blocked_on_objective_id: "",
  });

  await awardPoints(sdk, {
    matchId: match.id,
    objectiveId: objective.id,
    playerId: me.id,
    eventType: "objective_confirmed",
    points: objective.effort_points || 0,
    note: objective.title,
  });

  const tagIns = await list(
    s.entities.TagInRequest.filter({ match_id: match.id, objective_id: objective.id })
  );
  const accepted = tagIns.find((t) => t.status === "accepted" && t.accepting_owner_id === me.id);
  if (accepted) {
    await awardPoints(sdk, {
      matchId: match.id,
      objectiveId: objective.id,
      playerId: me.id,
      eventType: "tagin_assist",
      points: XP.tagin_assist,
      note: `Finished a tagged-in mission: ${objective.title}`,
      keySuffix: accepted.id,
    });
  }

  await logEvent(sdk, {
    match,
    me,
    eventType: "objective_confirmed",
    relatedPlayerIds: [me.id],
    context: `${me.display_name} banked ${objective.effort_points} XP for "${objective.title}".`,
    ctx: { name: me.display_name, points: objective.effort_points },
  });
}

/* -------------------------------------------------------------- start / stop */

export const startObjective = createServerFn({ method: "POST" })
  .validator(creds.extend({ objectiveId: z.string().min(1) }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      if (match.status !== "live") fail("The match isn't live yet.");
      const objective = await loadObjective(s, data.objectiveId, match.id);
      if (objective.owner_id !== me.id) fail("That mission belongs to another player.");
      if (objective.status === "confirmed") fail("That mission is already confirmed.");
      if (objective.status === "under_review") fail("That mission is already under review.");

      await s.entities.Objective.update(objective.id, {
        status: "in_progress",
        blocked_reason: "",
        blocked_on_objective_id: "",
      });
      const event = await logEvent(sdk, {
        match,
        me,
        eventType: "objective_started",
        context: `${me.display_name} started the mission "${objective.title}".`,
        ctx: { mission: objective.title },
      });
      await patchState(sdk, match.id, (st) => {
        patchObjective(st, objective.id, {
          status: "in_progress",
          blocked_reason: "",
          blocked_on_objective_id: "",
        });
        pushEvent(st, event);
        return st;
      });
      return { status: "in_progress" };
    })
  );

/* ------------------------------------------------------------------- referee */

export const submitProof = createServerFn({ method: "POST" })
  .validator(
    creds.extend({
      objectiveId: z.string().min(1),
      text: z.string().trim().max(4000).optional().default(""),
      resourceReference: z.string().trim().max(600).optional().default(""),
      fileUri: z.string().trim().max(600).optional().default(""),
    })
  )
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      if (match.status !== "live") fail("The match isn't live yet.");
      const objective = await loadObjective(s, data.objectiveId, match.id);
      if (objective.owner_id !== me.id) fail("You can only submit proof for your own missions.");
      if (objective.status === "confirmed") fail("That mission is already confirmed.");
      if (objective.status === "tag_in_requested")
        fail("This mission is waiting on a tag-in — cancel the handoff first.");
      if (!data.text.trim() && !data.resourceReference.trim())
        fail("Add a short explanation or a link so the referee has something to check.");

      const [evidence] = await Promise.all([
        s.entities.Evidence.create({
          match_id: match.id,
          objective_id: objective.id,
          submitted_by: me.id,
          text: data.text,
          resource_reference: data.resourceReference,
          file_uri: data.fileUri,
          review_status: "pending",
          submitted_at: new Date().toISOString(),
        }),
        s.entities.Objective.update(objective.id, {
          status: "under_review",
          submitted_at: new Date().toISOString(),
        }),
      ]);

      const prompt = `You are the CARRIED referee (VAR). Judge submitted work against the mission's acceptance criteria.

MISSION: ${objective.title}
WHAT "DONE" MEANS: ${objective.acceptance_criteria || objective.description || "not specified"}

EVIDENCE FROM THE PLAYER:
"""
${data.text || "(no written explanation — only a link)"}
"""

LINK SUPPLIED: ${data.resourceReference || "none"}
ATTACHED FILE: ${data.fileUri ? "yes, a file was attached" : "none"}

RULES
- You cannot open links or read attachments. A link only proves something was linked, never that it contains what the player claims.
- CONFIRMED only when the written evidence clearly satisfies the acceptance criteria.
- NEEDS_REVISION when real evidence exists but specific requirements are clearly missing.
- INSUFFICIENT_EVIDENCE when there is nothing checkable in the text (e.g. only a link, or one vague sentence).
- reason: ONE sentence, max 25 words, specific about what is or isn't there.
- requirements_met / requirements_missing: short phrases, max 5 each.
- confidence: 0 to 1.`;

      let review;
      try {
        const result = await s.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: REVIEW_SCHEMA,
        });
        const decision = ["CONFIRMED", "NEEDS_REVISION", "INSUFFICIENT_EVIDENCE"].includes(
          result?.decision
        )
          ? result.decision
          : "NEEDS_REVISION";
        review = await s.entities.Review.create({
          match_id: match.id,
          evidence_id: evidence.id,
          objective_id: objective.id,
          reviewer_id: "ai",
          reviewer_name: "VAR Referee",
          recommendation: decision,
          explanation: String(result?.reason || "").slice(0, 400),
          requirements_met: Array.isArray(result?.requirements_met)
            ? result.requirements_met.slice(0, 6).map((x) => String(x).slice(0, 160))
            : [],
          requirements_missing: Array.isArray(result?.requirements_missing)
            ? result.requirements_missing.slice(0, 6).map((x) => String(x).slice(0, 160))
            : [],
          confidence: Math.max(0, Math.min(1, Number(result?.confidence) || 0.5)),
          is_ai: true,
        });
      } catch {
        review = await s.entities.Review.create({
          match_id: match.id,
          evidence_id: evidence.id,
          objective_id: objective.id,
          reviewer_id: "ai",
          reviewer_name: "VAR Referee",
          recommendation: "NEEDS_REVISION",
          explanation:
            "The referee is offline, so a teammate needs to review this submission by hand.",
          requirements_met: [],
          requirements_missing: ["Manual teammate review required"],
          confidence: 0,
          is_ai: true,
        });
      }

      const event = await logEvent(sdk, {
        match,
        me,
        eventType: "proof_submitted",
        relatedPlayerIds: [],
        context: `${me.display_name} submitted proof for "${objective.title}". The referee recommends ${review.recommendation.replace(/_/g, " ").toLowerCase()}.`,
      });

      await patchState(sdk, match.id, (st) => {
        patchObjective(st, objective.id, {
          status: "under_review",
          submitted_at: evidence.submitted_at,
        });
        patchEvidence(st, objective.id, {
          ...evidence,
          created_date: evidence.created_date || new Date().toISOString(),
          reviews: [review],
        });
        pushEvent(st, event);
        return st;
      });

      if (match.is_demo) {
        await autoCompleteDemo(sdk, { match, me, objective, evidence });
        const freshState = await rebuildSnapshot(sdk, match.id);
        const summary = buildMatchSummary({ state: freshState, match });
        const finished = await s.entities.Match.update(match.id, {
          status: "finished",
          ended_at: summary.ended_at,
          summary,
        });
        await logEvent(sdk, {
          match: finished,
          me,
          eventType: "match_finished",
          context: `The match "${match.title}" ended.`,
        });
        await rebuildSnapshot(sdk, match.id);
        return { evidenceId: evidence.id, review, autoFinished: true, summary };
      }

      return { evidenceId: evidence.id, review };
    })
  );

export const decideReview = createServerFn({ method: "POST" })
  .validator(
    creds.extend({
      evidenceId: z.string().min(1),
      decision: z.enum(["CONFIRMED", "NEEDS_REVISION"]),
      note: z.string().trim().max(400).optional().default(""),
    })
  )
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      if (match.status !== "live") fail("The match isn't live.");

      const evidence = await s.entities.Evidence.get(data.evidenceId);
      if (!evidence || evidence.match_id !== match.id) fail("That submission isn't in this match.");
      const objective = await loadObjective(s, evidence.objective_id, match.id);

      const players = await list(s.entities.Player.filter({ match_id: match.id }));
      if (players.length > 1 && evidence.submitted_by === me.id)
        fail("You can't review your own disputed submission — a teammate has to call it.");

      if (objective.status === "confirmed") return { already: true };
      if (objective.status !== "under_review" && objective.status !== "needs_revision")
        fail("That mission isn't waiting on a review.");

      await s.entities.Review.create({
        match_id: match.id,
        evidence_id: evidence.id,
        objective_id: objective.id,
        reviewer_id: me.id,
        reviewer_name: me.display_name,
        recommendation: data.decision,
        explanation: data.note,
        requirements_met: [],
        requirements_missing: [],
        confidence: 1,
        is_ai: false,
      });

      const reviewerBonus =
        evidence.submitted_by === me.id
          ? 0
          : await awardPoints(sdk, {
              matchId: match.id,
              objectiveId: objective.id,
              playerId: me.id,
              eventType: "review_help",
              points: XP.review_help,
              note: `Review call on ${objective.title}`,
              keySuffix: evidence.id,
            });

      if (data.decision === "NEEDS_REVISION") {
        await s.entities.Evidence.update(evidence.id, { review_status: "needs_revision" });
        await s.entities.Objective.update(objective.id, {
          status: "needs_revision",
          confirmed_at: "",
        });
        await logEvent(sdk, {
          match,
          me,
          eventType: "objective_rejected",
          relatedPlayerIds: [objective.owner_id],
          context: `Reviewer ${me.display_name} sent "${objective.title}" back for changes.`,
        });
        await rebuildSnapshot(sdk, match.id);
        return { decision: "NEEDS_REVISION", reviewerBonus };
      }

      /* ---- confirmed ---- */
      await s.entities.Evidence.update(evidence.id, { review_status: "confirmed" });
      await s.entities.Objective.update(objective.id, {
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        blocked_reason: "",
        blocked_on_objective_id: "",
      });

      const ownerId = objective.owner_id;
      const owner = players.find((p) => p.id === ownerId);
      await awardPoints(sdk, {
        matchId: match.id,
        objectiveId: objective.id,
        playerId: ownerId,
        eventType: "objective_confirmed",
        points: objective.effort_points || 0,
        note: objective.title,
      });

      const tagIns = await list(
        s.entities.TagInRequest.filter({ match_id: match.id, objective_id: objective.id })
      );
      const acceptedTagIn = tagIns.find((t) => t.status === "accepted");
      if (acceptedTagIn && acceptedTagIn.accepting_owner_id === ownerId) {
        await awardPoints(sdk, {
          matchId: match.id,
          objectiveId: objective.id,
          playerId: ownerId,
          eventType: "tagin_assist",
          points: XP.tagin_assist,
          note: `Finished a tagged-in mission: ${objective.title}`,
          keySuffix: acceptedTagIn.id,
        });
      }

      const rescues = await list(
        s.entities.RescueRequest.filter({ match_id: match.id, objective_id: objective.id })
      );
      for (const rescue of rescues) {
        if (!rescue.helper_id) continue;
        if (rescue.status !== "resolved") {
          await s.entities.RescueRequest.update(rescue.id, {
            status: "resolved",
            resolved_at: new Date().toISOString(),
          });
        }
        await awardPoints(sdk, {
          matchId: match.id,
          objectiveId: objective.id,
          playerId: rescue.helper_id,
          eventType: "rescue_assist",
          points: XP.rescue_assist,
          note: `Rescue on ${objective.title}`,
          keySuffix: rescue.id,
        });
      }

      await logEvent(sdk, {
        match,
        me,
        eventType: "objective_confirmed",
        relatedPlayerIds: [ownerId],
        context: `${owner?.display_name || "The owner"} banked ${objective.effort_points} XP for "${objective.title}".`,
        ctx: { name: owner?.display_name, points: objective.effort_points },
      });

      // critical path: dependents that are now unblocked
      const deps = await dependentsOf(s, match.id, objective.id);
      if (deps.length) {
        const allDeps = await list(s.entities.Dependency.filter({ match_id: match.id }));
        const objs = await list(s.entities.Objective.filter({ match_id: match.id }));
        const status = {};
        objs.forEach((o) => {
          status[o.id] = o.status;
        });
        const cleared = deps.filter((d) => {
          const siblings = allDeps.filter((x) => x.objective_id === d.objective_id);
          return siblings.every((x) => status[x.prerequisite_objective_id] === "confirmed");
        });
        if (cleared.length) {
          await logEvent(sdk, {
            match,
            me,
            eventType: "dependency_cleared",
            context: `${cleared.length} mission(s) were waiting on "${objective.title}" and can move now.`,
          });
        }
      }

      await rebuildSnapshot(sdk, match.id);
      return { decision: "CONFIRMED", reviewerBonus, points: objective.effort_points };
    })
  );

/* -------------------------------------------------------------------- rescue */

export const requestRescue = createServerFn({ method: "POST" })
  .validator(
    creds.extend({
      objectiveId: z.string().min(1),
      blocker: z.string().trim().min(3).max(600),
      requestedHelp: z.string().trim().min(3).max(600),
      links: z.string().trim().max(600).optional().default(""),
      retainResponsibility: z.boolean().optional().default(true),
      blockedOnObjectiveId: z.string().optional().default(""),
    })
  )
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      if (match.status !== "live") fail("The match isn't live yet.");
      const objective = await loadObjective(s, data.objectiveId, match.id);
      if (objective.owner_id !== me.id) fail("You can only call for help on your own missions.");
      if (objective.status === "confirmed") fail("That mission is already confirmed.");
      if (objective.status === "under_review") fail("That mission is already under review.");

      const existing = await list(
        s.entities.RescueRequest.filter({
          match_id: match.id,
          objective_id: objective.id,
          requested_by: me.id,
        })
      );
      if (existing.some((r) => r.status === "open" || r.status === "volunteered"))
        fail("You already have an open rescue request on this mission.");

      const rescue = await s.entities.RescueRequest.create({
        match_id: match.id,
        objective_id: objective.id,
        requested_by: me.id,
        blocker: data.blocker,
        requested_help: data.requestedHelp,
        relevant_links: data.links,
        retain_responsibility: data.retainResponsibility,
        blocked_on_objective_id: data.blockedOnObjectiveId,
        status: "open",
        created_at: new Date().toISOString(),
      });

      await s.entities.Objective.update(objective.id, {
        status: "blocked",
        blocked_reason: data.blocker,
        blocked_on_objective_id: data.blockedOnObjectiveId,
      });

      const event = await logEvent(sdk, {
        match,
        me,
        eventType: "rescue_requested",
        context: `${me.display_name} needs backup on "${objective.title}": ${data.blocker}`,
      });

      await patchState(sdk, match.id, (st) => {
        st.rescues = [
          {
            id: rescue.id,
            objective_id: objective.id,
            requested_by: me.id,
            blocker: data.blocker,
            requested_help: data.requestedHelp,
            relevant_links: data.links,
            retain_responsibility: data.retainResponsibility,
            helper_id: "",
            status: "open",
            resolved_at: "",
            created_date: rescue.created_date || new Date().toISOString(),
          },
          ...st.rescues,
        ];
        patchObjective(st, objective.id, {
          status: "blocked",
          blocked_reason: data.blocker,
          blocked_on_objective_id: data.blockedOnObjectiveId,
        });
        pushEvent(st, event);
        return st;
      });

      return { requested: true };
    })
  );

export const volunteerRescue = createServerFn({ method: "POST" })
  .validator(creds.extend({ rescueId: z.string().min(1) }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      const rescue = await s.entities.RescueRequest.get(data.rescueId);
      if (!rescue || rescue.match_id !== match.id) fail("That rescue isn't in this match.");
      if (rescue.requested_by === me.id) fail("You asked for this help — someone else has to jump in.");
      if (rescue.status !== "open") fail("That rescue already has a volunteer.");
      const objective = await loadObjective(s, rescue.objective_id, match.id);

      await s.entities.RescueRequest.update(rescue.id, {
        status: "volunteered",
        helper_id: me.id,
      });
      const event = await logEvent(sdk, {
        match,
        me,
        eventType: "rescue_volunteered",
        relatedPlayerIds: [rescue.requested_by],
        context: `${me.display_name} jumped in to help with "${objective.title}".`,
      });
      await patchState(sdk, match.id, (st) => {
        patchRescue(st, rescue.id, { status: "volunteered", helper_id: me.id });
        pushEvent(st, event);
        return st;
      });
      return { volunteered: true };
    })
  );

export const resolveRescue = createServerFn({ method: "POST" })
  .validator(creds.extend({ rescueId: z.string().min(1) }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      const rescue = await s.entities.RescueRequest.get(data.rescueId);
      if (!rescue || rescue.match_id !== match.id) fail("That rescue isn't in this match.");
      if (rescue.requested_by !== me.id) fail("Only the mission owner can close this rescue.");
      const objective = await loadObjective(s, rescue.objective_id, match.id);

      await s.entities.RescueRequest.update(rescue.id, {
        status: "resolved",
        resolved_at: new Date().toISOString(),
      });
      if (objective.status === "blocked") {
        await s.entities.Objective.update(objective.id, {
          status: "in_progress",
          blocked_reason: "",
          blocked_on_objective_id: "",
        });
      }
      const event = await logEvent(sdk, {
        match,
        me,
        eventType: "rescue_completed",
        context: `${me.display_name} is unblocked on "${objective.title}".`,
      });
      await patchState(sdk, match.id, (st) => {
        patchRescue(st, rescue.id, { status: "resolved", resolved_at: new Date().toISOString() });
        if (objective.status === "blocked") {
          patchObjective(st, objective.id, {
            status: "in_progress",
            blocked_reason: "",
            blocked_on_objective_id: "",
          });
        }
        pushEvent(st, event);
        return st;
      });
      return { resolved: true };
    })
  );

/* -------------------------------------------------------------------- tag-in */

export const requestTagIn = createServerFn({ method: "POST" })
  .validator(
    creds.extend({
      objectiveId: z.string().min(1),
      finishedWork: z.string().trim().min(3).max(800),
      remainingWork: z.string().trim().min(3).max(800),
      resourceLinks: z.string().trim().max(800).optional().default(""),
      reason: z.string().trim().max(400).optional().default(""),
    })
  )
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      if (match.status !== "live") fail("The match isn't live yet.");
      const objective = await loadObjective(s, data.objectiveId, match.id);
      if (objective.owner_id !== me.id) fail("You can only hand off your own missions.");
      if (objective.status === "confirmed") fail("That mission is already done.");

      const existing = await list(
        s.entities.TagInRequest.filter({
          match_id: match.id,
          objective_id: objective.id,
          status: "open",
        })
      );
      if (existing.length) fail("A tag-in is already open on this mission.");

      const requestedAt = new Date().toISOString();
      const tagIn = await s.entities.TagInRequest.create({
        match_id: match.id,
        objective_id: objective.id,
        original_owner_id: me.id,
        finished_work: data.finishedWork,
        remaining_work: data.remainingWork,
        resource_links: data.resourceLinks,
        reason: data.reason,
        status: "open",
        requested_at: requestedAt,
      });
      await s.entities.Objective.update(objective.id, { status: "tag_in_requested" });

      const event = await logEvent(sdk, {
        match,
        me,
        eventType: "tagin_requested",
        context: `${me.display_name} is handing off "${objective.title}".`,
      });
      await patchState(sdk, match.id, (st) => {
        st.tagIns = [
          {
            id: tagIn.id,
            objective_id: objective.id,
            original_owner_id: me.id,
            accepting_owner_id: "",
            finished_work: data.finishedWork,
            remaining_work: data.remainingWork,
            resource_links: data.resourceLinks,
            reason: data.reason,
            status: "open",
            requested_at: requestedAt,
            accepted_at: "",
          },
          ...st.tagIns,
        ];
        patchObjective(st, objective.id, { status: "tag_in_requested" });
        pushEvent(st, event);
        return st;
      });
      return { requested: true };
    })
  );

export const acceptTagIn = createServerFn({ method: "POST" })
  .validator(creds.extend({ tagInId: z.string().min(1) }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      const tagIn = await s.entities.TagInRequest.get(data.tagInId);
      if (!tagIn || tagIn.match_id !== match.id) fail("That handoff isn't in this match.");
      if (tagIn.status !== "open") fail("That handoff has already been taken.");
      if (tagIn.original_owner_id === me.id) fail("You can't tag yourself in — it's already yours.");

      const objective = await loadObjective(s, tagIn.objective_id, match.id);
      if (objective.status !== "tag_in_requested") fail("That mission isn't waiting on a handoff.");

      const previous = Array.isArray(objective.previous_owner_ids)
        ? objective.previous_owner_ids
        : [];

      await s.entities.Objective.update(objective.id, {
        owner_id: me.id,
        previous_owner_ids: [...previous, tagIn.original_owner_id],
        status: "in_progress",
        blocked_reason: "",
        blocked_on_objective_id: "",
      });
      await s.entities.TagInRequest.update(tagIn.id, {
        accepting_owner_id: me.id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      });
      const handoff = await awardPoints(sdk, {
        matchId: match.id,
        objectiveId: objective.id,
        playerId: tagIn.original_owner_id,
        eventType: "clean_handoff",
        points: XP.clean_handoff,
        note: `Clean handoff of ${objective.title}`,
        keySuffix: tagIn.id,
      });
      const event = await logEvent(sdk, {
        match,
        me,
        eventType: "tagin_accepted",
        relatedPlayerIds: [tagIn.original_owner_id],
        context: `${me.display_name} tagged in to finish "${objective.title}".`,
        ctx: { other: me.display_name },
      });
      await patchState(sdk, match.id, (st) => {
        patchObjective(st, objective.id, {
          owner_id: me.id,
          previous_owner_ids: [...previous, tagIn.original_owner_id],
          status: "in_progress",
          blocked_reason: "",
          blocked_on_objective_id: "",
        });
        patchTagIn(st, tagIn.id, {
          accepting_owner_id: me.id,
          status: "accepted",
          accepted_at: new Date().toISOString(),
        });
        pushContribution(st, handoff);
        pushEvent(st, event);
        return st;
      });
      return { accepted: true };
    })
  );

export const cancelTagIn = createServerFn({ method: "POST" })
  .validator(creds.extend({ tagInId: z.string().min(1) }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      const tagIn = await s.entities.TagInRequest.get(data.tagInId);
      if (!tagIn || tagIn.match_id !== match.id) fail("That handoff isn't in this match.");
      if (tagIn.original_owner_id !== me.id) fail("Only the owner can cancel this handoff.");
      if (tagIn.status !== "open") fail("That handoff is already closed.");
      const objective = await loadObjective(s, tagIn.objective_id, match.id);

      await s.entities.TagInRequest.update(tagIn.id, { status: "cancelled" });
      if (objective.status === "tag_in_requested") {
        await s.entities.Objective.update(objective.id, { status: "in_progress" });
      }
      const event = await logEvent(sdk, {
        match,
        me,
        eventType: "tagin_cancelled",
        context: `${me.display_name} keeps "${objective.title}" after all.`,
      });
      await patchState(sdk, match.id, (st) => {
        patchTagIn(st, tagIn.id, { status: "cancelled" });
        if (objective.status === "tag_in_requested") {
          patchObjective(st, objective.id, { status: "in_progress" });
        }
        pushEvent(st, event);
        return st;
      });
      return { cancelled: true };
    })
  );

/* --------------------------------------------------------------- match admin */

export const setCaster = createServerFn({ method: "POST" })
  .validator(creds.extend({ enabled: z.boolean() }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const { match, me } = await authMatch(sdk, data.code, data.token);
      assertHost(match, me);
      const settings = { ...(match.settings || {}), caster: data.enabled };
      await sdk.asServiceRole.entities.Match.update(match.id, { settings });
      await patchState(sdk, match.id, (st) => {
        st.match.settings = settings;
        return st;
      });
      return { caster: data.enabled };
    })
  );

export const setFinalBoss = createServerFn({ method: "POST" })
  .validator(creds.extend({ active: z.boolean() }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      assertHost(match, me);
      await s.entities.Match.update(match.id, { final_boss_active: data.active });
      const event = data.active
        ? await logEvent(sdk, {
            match,
            me,
            eventType: "boss_activated",
            context: "The host triggered Final Boss mode.",
          })
        : null;
      await patchState(sdk, match.id, (st) => {
        st.match.final_boss_active = data.active;
        pushEvent(st, event);
        return st;
      });
      return { active: data.active };
    })
  );

export const endMatch = createServerFn({ method: "POST" })
  .validator(creds)
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      assertHost(match, me);
      if (match.status === "finished") return { summary: match.summary || null };

      const state = await rebuildSnapshot(sdk, match.id);
      const { awards } = awardPool(state);

      let descriptions = {};
      if (awards.length) {
        try {
          const result = await s.integrations.Core.InvokeLLM({
            prompt: `You are writing the award blurbs for the end-of-match screen of CARRIED, a co-op group project game.

Awards (each is based on a real recorded stat):
${awards
  .map(
    (a) =>
      `- key: ${a.key} | title: ${AWARD_TITLE[a.key]} | player: ${a.holder.name} | criteria: ${AWARD_CRITERIA[a.key]} | stats: ${JSON.stringify(a.holder)}`
  )
  .join("\n")}

For each award write ONE playful, positive sentence (max 18 words) that celebrates the player using only the stats given. Never invent achievements or numbers. No quotes.`,
            response_json_schema: {
              type: "object",
              properties: {
                awards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { key: { type: "string" }, description: { type: "string" } },
                    required: ["key", "description"],
                  },
                },
              },
              required: ["awards"],
            },
          });
          (result?.awards || []).forEach((a) => {
            if (a?.key && a?.description) descriptions[a.key] = String(a.description).slice(0, 220);
          });
        } catch {
          descriptions = {};
        }
      }

      const summary = buildMatchSummary({ state, match, descriptions });

      const fresh = await s.entities.Match.update(match.id, {
        status: "finished",
        ended_at: summary.ended_at,
        summary,
      });

      await logEvent(sdk, {
        match: fresh,
        me,
        eventType: "match_finished",
        context: `The match "${match.title}" ended.`,
      });
      await rebuildSnapshot(sdk, match.id);

      return { summary };
    })
  );
