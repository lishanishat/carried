import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  assertHost,
  authMatch,
  fail,
  list,
  logEvent,
  patchObjective,
  patchState,
  pushEvent,
  rebuildSnapshot,
} from "./game-engine";

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

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string" },
    roles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          objectives: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                acceptance_criteria: { type: "string" },
                effort_points: { type: "number" },
                difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
                depends_on: { type: "array", items: { type: "string" } },
              },
              required: ["id", "title", "acceptance_criteria", "effort_points", "difficulty"],
            },
          },
        },
        required: ["title", "description", "objectives"],
      },
    },
  },
  required: ["overview", "roles"],
};

async function refreshRoleEffort(s, roleId) {
  const objs = await list(s.entities.Objective.filter({ role_id: roleId }));
  const total = objs.reduce((sum, o) => sum + (o.effort_points || 0), 0);
  await s.entities.Role.update(roleId, { estimated_effort: total });
  return total;
}

async function clearDraft(s, matchId) {
  await s.entities.Dependency.deleteMany({ match_id: matchId });
  await s.entities.Objective.deleteMany({ match_id: matchId });
  await s.entities.Role.deleteMany({ match_id: matchId });
}

export const generateDraft = createServerFn({ method: "POST" })
  .validator(creds)
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      assertHost(match, me);
      if (match.status === "live" || match.status === "finished")
        fail("Missions are already locked in — the match is under way.");
      if (!match.brief || match.brief.trim().length < 20)
        fail("Add a project brief first (at least a couple of sentences).");

      const deadlineLabel = new Date(match.deadline).toUTCString();
      const prompt = `You are the draft engine for CARRIED, a co-op group project game.

PROJECT BRIEF:
"""
${match.brief}
"""

TEAM SIZE: ${match.teamSize || match.team_size} players
PROJECT DEADLINE: ${deadlineLabel}

Draft the missions for this squad.

RULES
- Return exactly ${match.team_size} roles that genuinely fit this brief.
- Each role gets 3 to 5 missions.
- Missions must be concrete and verifiable: name the artifact and how much of it. Bad: "Work on the research." Good: "Identify three credible research sources and write a 250-word evidence summary with citations."
- acceptance_criteria = what "done" means in one sentence, referencing a real artifact, count or section.
- effort_points: 80 to 400. Total effort must be balanced across roles (no role more than 20% above another). Different missions can carry different points; do not just give equal counts.
- difficulty: Easy, Medium or Hard, matching effort.
- depends_on: array of mission ids that must finish first. Only reference ids of missions listed BEFORE this one (read the list top to bottom). Use [] when nothing blocks it.
- Give every mission a short unique id ("m1", "m2", ...).
- Order the roles and missions in a sensible execution order.
- overview: 2 sentences describing the project plan.`;

      let draft;
      try {
        draft = await s.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: DRAFT_SCHEMA,
        });
      } catch {
        fail("The AI draft failed to generate. Retry, or build the missions manually.");
      }

      const roles = Array.isArray(draft?.roles) ? draft.roles.slice(0, 4) : [];
      if (!roles.length) fail("The AI draft came back empty. Retry, or add missions manually.");

      await clearDraft(s, match.id);

      const deadlineMs = new Date(match.deadline).getTime() || Date.now() + 7 * 864e5;
      const now = Date.now();
      const totalMissions = roles.reduce(
        (n, r) => n + (Array.isArray(r.objectives) ? r.objectives.length : 0),
        0
      );

      const idMap = {};
      let index = 0;
      const createdRoles = [];

      for (let r = 0; r < roles.length; r += 1) {
        const role = roles[r];
        const createdRole = await s.entities.Role.create({
          match_id: match.id,
          title: String(role.title || `Role ${r + 1}`).slice(0, 80),
          description: String(role.description || "").slice(0, 600),
          order: r,
          estimated_effort: 0,
          locked: false,
        });
        createdRoles.push(createdRole);

        const objectives = Array.isArray(role.objectives) ? role.objectives : [];
        for (const obj of objectives) {
          index += 1;
          const share = totalMissions ? index / totalMissions : 1;
          const targetMs = now + Math.max(0, deadlineMs - now) * Math.min(1, share);
          const created = await s.entities.Objective.create({
            match_id: match.id,
            role_id: createdRole.id,
            owner_id: "",
            title: String(obj.title || "Untitled mission").slice(0, 120),
            description: String(obj.description || "").slice(0, 1200),
            acceptance_criteria: String(obj.acceptance_criteria || "").slice(0, 800),
            effort_points: Math.max(20, Math.min(500, Math.round(Number(obj.effort_points) || 100))),
            difficulty: ["Easy", "Medium", "Hard"].includes(obj.difficulty)
              ? obj.difficulty
              : "Medium",
            status: "available",
            order: index,
            deadline: new Date(Math.min(deadlineMs, targetMs)).toISOString(),
            previous_owner_ids: [],
          });
          if (obj.id) idMap[String(obj.id)] = created;
        }
      }

      // Dependencies — only from already-created missions, so cycles are impossible.
      for (const role of roles) {
        for (const obj of Array.isArray(role.objectives) ? role.objectives : []) {
          const target = idMap[String(obj.id)];
          if (!target) continue;
          for (const depLocal of Array.isArray(obj.depends_on) ? obj.depends_on : []) {
            const prereq = idMap[String(depLocal)];
            if (!prereq || prereq.id === target.id) continue;
            if ((prereq.order || 0) >= (target.order || 0)) continue;
            await s.entities.Dependency.create({
              match_id: match.id,
              objective_id: target.id,
              prerequisite_objective_id: prereq.id,
            });
          }
        }
      }

      for (const role of createdRoles) await refreshRoleEffort(s, role.id);

      await s.entities.Match.update(match.id, {
        status: "draft",
        overview: String(draft?.overview || "").slice(0, 800),
      });
      await rebuildSnapshot(sdk, match.id);

      return { missions: totalMissions, roles: createdRoles.length };
    })
  );

export const createRole = createServerFn({ method: "POST" })
  .validator(
    creds.extend({
      title: z.string().trim().min(2).max(80),
      description: z.string().trim().max(400).optional().default(""),
    })
  )
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      assertHost(match, me);
      if (match.status === "live" || match.status === "finished")
        fail("Roles are locked once the match is live.");
      const roles = await list(s.entities.Role.filter({ match_id: match.id }));
      const created = await s.entities.Role.create({
        match_id: match.id,
        title: data.title,
        description: data.description,
        order: roles.length,
        estimated_effort: 0,
        locked: false,
      });
      if (match.status === "lobby") {
        await s.entities.Match.update(match.id, { status: "draft" });
      }
      await rebuildSnapshot(sdk, match.id);
      return { roleId: created.id };
    })
  );

export const saveSetup = createServerFn({ method: "POST" })
  .validator(
    creds.extend({
      brief: z.string().trim().max(6000).optional().default(""),
      deadline: z.string().optional().default(""),
      teamSize: z.number().int().min(2).max(4).optional(),
    })
  )
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      assertHost(match, me);
      if (match.status === "live" || match.status === "finished")
        fail("Setup is locked once the match is live.");
      const patch = { brief: data.brief };
      if (data.deadline) patch.deadline = data.deadline;
      if (data.teamSize) patch.team_size = data.teamSize;
      await s.entities.Match.update(match.id, patch);
      await patchState(sdk, match.id, (st) => {
        st.match.brief = data.brief;
        if (patch.deadline) st.match.deadline = patch.deadline;
        if (patch.team_size) st.match.team_size = patch.team_size;
        return st;
      });
      return { saved: true };
    })
  );

export const updateObjective = createServerFn({ method: "POST" })
  .validator(
    creds.extend({
      objectiveId: z.string().min(1),
      title: z.string().trim().min(2).max(140),
      description: z.string().trim().max(1200).optional().default(""),
      acceptance_criteria: z.string().trim().max(800).optional().default(""),
      effort_points: z.number().min(20).max(500),
      difficulty: z.enum(["Easy", "Medium", "Hard"]),
    })
  )
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      assertHost(match, me);
      if (match.status === "live" || match.status === "finished")
        fail("Missions can't be edited once the match is live.");
      const objective = await s.entities.Objective.update(data.objectiveId, {
        title: data.title,
        description: data.description,
        acceptance_criteria: data.acceptance_criteria,
        effort_points: data.effort_points,
        difficulty: data.difficulty,
      });
      const effort = await refreshRoleEffort(s, objective.role_id);
      await patchState(sdk, match.id, (st) => {
        patchObjective(st, objective.id, {
          title: data.title,
          description: data.description,
          acceptance_criteria: data.acceptance_criteria,
          effort_points: data.effort_points,
          difficulty: data.difficulty,
        });
        st.roles = st.roles.map((r) =>
          r.id === objective.role_id ? { ...r, estimated_effort: effort } : r
        );
        return st;
      });
      return { objectiveId: objective.id };
    })
  );

export const addObjective = createServerFn({ method: "POST" })
  .validator(
    creds.extend({
      roleId: z.string().min(1),
      title: z.string().trim().min(2).max(140),
      description: z.string().trim().max(1200).optional().default(""),
      acceptance_criteria: z.string().trim().max(800).optional().default(""),
      effort_points: z.number().min(20).max(500).default(100),
      difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
    })
  )
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      assertHost(match, me);
      if (match.status === "live" || match.status === "finished")
        fail("Missions can't be added once the match is live.");

      const existing = await list(s.entities.Objective.filter({ match_id: match.id }));
      const order = existing.reduce((m, o) => Math.max(m, o.order || 0), 0) + 1;
      const created = await s.entities.Objective.create({
        match_id: match.id,
        role_id: data.roleId,
        owner_id: "",
        title: data.title,
        description: data.description,
        acceptance_criteria: data.acceptance_criteria,
        effort_points: data.effort_points,
        difficulty: data.difficulty,
        status: "available",
        order,
        deadline: match.deadline,
        previous_owner_ids: [],
      });
      const effort = await refreshRoleEffort(s, data.roleId);
      await patchState(sdk, match.id, (st) => {
        st.objectives = [
          ...st.objectives,
          {
            id: created.id,
            role_id: data.roleId,
            owner_id: "",
            title: data.title,
            description: data.description,
            acceptance_criteria: data.acceptance_criteria,
            effort_points: data.effort_points,
            difficulty: data.difficulty,
            status: "available",
            deadline: match.deadline || "",
            order,
            blocked_reason: "",
            blocked_on_objective_id: "",
            previous_owner_ids: [],
            submitted_at: "",
            confirmed_at: "",
            evidence: [],
          },
        ];
        st.roles = st.roles.map((r) =>
          r.id === data.roleId ? { ...r, estimated_effort: effort } : r
        );
        return st;
      });
      return { objectiveId: created.id };
    })
  );

export const deleteObjective = createServerFn({ method: "POST" })
  .validator(creds.extend({ objectiveId: z.string().min(1) }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      assertHost(match, me);
      if (match.status === "live" || match.status === "finished")
        fail("Missions can't be removed once the match is live.");
      const objective = await s.entities.Objective.get(data.objectiveId);
      await s.entities.Dependency.deleteMany({
        match_id: match.id,
        objective_id: data.objectiveId,
      });
      await s.entities.Dependency.deleteMany({
        match_id: match.id,
        prerequisite_objective_id: data.objectiveId,
      });
      await s.entities.Objective.delete(data.objectiveId);
      await refreshRoleEffort(s, objective.role_id);
      await rebuildSnapshot(sdk, match.id);
      return { deleted: true };
    })
  );

export const claimRole = createServerFn({ method: "POST" })
  .validator(creds.extend({ roleId: z.string().min(1), release: z.boolean().optional().default(false) }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      if (match.status !== "lobby" && match.status !== "draft")
        fail("Roles are locked — the match is already live.");

      const role = await s.entities.Role.get(data.roleId);
      if (role.match_id !== match.id) fail("That role isn't in this match.");

      if (data.release) {
        if (role.owner_player_id !== me.id) fail("You don't own that role.");
        await s.entities.Role.update(role.id, { owner_player_id: "", locked: false });
        if (me.role_id === role.id) await s.entities.Player.update(me.id, { role_id: "" });
        await patchState(sdk, match.id, (st) => {
          st.roles = st.roles.map((r) =>
            r.id === role.id ? { ...r, owner_player_id: "", locked: false } : r
          );
          st.players = st.players.map((p) =>
            p.id === me.id && p.role_id === role.id ? { ...p, role_id: "" } : p
          );
          return st;
        });
        return { released: true };
      }

      if (role.owner_player_id && role.owner_player_id !== me.id)
        fail("Someone already locked that role.");

      await s.entities.Role.update(role.id, { owner_player_id: me.id, locked: true });
      if (!me.role_id) await s.entities.Player.update(me.id, { role_id: role.id });

      const event = !role.owner_player_id
        ? await logEvent(sdk, {
            match,
            me,
            eventType: "role_locked",
            context: `${me.display_name} locked the role "${role.title}".`,
            ctx: { role: role.title },
          })
        : null;

      await patchState(sdk, match.id, (st) => {
        st.roles = st.roles.map((r) =>
          r.id === role.id ? { ...r, owner_player_id: me.id, locked: true } : r
        );
        st.players = st.players.map((p) =>
          p.id === me.id && !p.role_id ? { ...p, role_id: role.id } : p
        );
        pushEvent(st, event);
        return st;
      });
      return { roleId: role.id };
    })
  );

export const startMatch = createServerFn({ method: "POST" })
  .validator(creds)
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const { match, me } = await authMatch(sdk, data.code, data.token);
      assertHost(match, me);
      if (match.status === "live") fail("The match is already live.");

      const [roles, objectives] = await Promise.all([
        list(s.entities.Role.filter({ match_id: match.id })),
        list(s.entities.Objective.filter({ match_id: match.id })),
      ]);
      if (!roles.length) fail("Generate the missions first.");
      const unowned = roles.filter((r) => !r.owner_player_id);
      if (unowned.length)
        fail(`${unowned.length} role${unowned.length > 1 ? "s" : ""} still unclaimed.`);
      if (!objectives.length) fail("There are no missions to play yet.");

      const roleOwner = {};
      roles.forEach((r) => {
        roleOwner[r.id] = r.owner_player_id;
      });
      await Promise.all(
        objectives
          .filter((o) => !o.owner_id && roleOwner[o.role_id])
          .map((o) => s.entities.Objective.update(o.id, { owner_id: roleOwner[o.role_id] }))
      );

      const fresh = await s.entities.Match.update(match.id, {
        status: "live",
        started_at: new Date().toISOString(),
      });

      await logEvent(sdk, {
        match: fresh,
        me,
        eventType: "match_started",
        context: `The match "${match.title}" went live with ${roles.length} roles.`,
      });
      await rebuildSnapshot(sdk, match.id);

      return { started: true };
    })
  );
