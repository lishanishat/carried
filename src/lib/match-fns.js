import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fail,
  getMatchByCode,
  list,
  logEvent,
  makeCode,
  makeToken,
  readState,
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

const nameField = z.string().trim().min(1).max(24);

export const createMatch = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: nameField,
      title: z.string().trim().min(1).max(120),
      brief: z.string().trim().max(6000).optional().default(""),
      deadline: z.string().min(4),
      teamSize: z.number().int().min(2).max(4).default(3),
    })
  )
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;

      let code = makeCode();
      for (let i = 0; i < 10; i += 1) {
        const taken = await list(s.entities.Match.filter({ join_code: code }));
        if (!taken.length) break;
        code = makeCode();
      }

      const token = makeToken();
      const match = await s.entities.Match.create({
        join_code: code,
        title: data.title,
        brief: data.brief || "",
        deadline: data.deadline,
        status: "lobby",
        team_size: data.teamSize,
        settings: { caster: true, xp: XP },
        member_tokens: {},
        state_cache: null,
      });

      const player = await s.entities.Player.create({
        match_id: match.id,
        display_name: data.name,
        participant_token: token,
        is_host: true,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      });

      await s.entities.Match.update(match.id, {
        host_player_id: player.id,
        member_tokens: { [player.id]: token },
      });

      const fresh = await s.entities.Match.get(match.id);
      await logEvent(sdk, {
        match: fresh,
        me: player,
        eventType: "player_joined",
        context: `${data.name} opened the match "${data.title}".`,
      });
      await rebuildSnapshot(sdk, match.id);

      return { code, token, playerId: player.id, matchId: match.id };
    })
  );

export const joinMatch = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().trim().toUpperCase().length(4), name: nameField }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const match = await getMatchByCode(sdk, data.code);

      if (match.status === "finished") fail("That match is already over.");
      if (match.status === "live") fail("That match is already live. Ask the host to start a new one.");

      const players = await list(s.entities.Player.filter({ match_id: match.id }));
      if (players.length >= (match.team_size || 4)) fail("This match is full.");
      const clash = players.some(
        (p) => p.display_name.trim().toLowerCase() === data.name.toLowerCase()
      );
      if (clash) fail("That name is already taken in this match. Pick another.");

      const token = makeToken();
      const player = await s.entities.Player.create({
        match_id: match.id,
        display_name: data.name,
        participant_token: token,
        is_host: false,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      });

      await s.entities.Match.update(match.id, {
        member_tokens: { ...(match.member_tokens || {}), [player.id]: token },
      });

      await logEvent(sdk, {
        match,
        me: player,
        eventType: "player_joined",
        context: `${data.name} joined the squad for "${match.title}".`,
      });
      await rebuildSnapshot(sdk, match.id);

      return { code: match.join_code, token, playerId: player.id, matchId: match.id };
    })
  );

export const getMatchState = createServerFn({ method: "POST" })
  .validator(
    z.object({ code: z.string().trim().toUpperCase(), token: z.string().optional().default("") })
  )
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const { state } = await readState(sdk, data.code, data.token);
      return { state };
    })
  );
