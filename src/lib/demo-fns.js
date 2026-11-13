import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fail, list } from "./game-engine";
import { DEMO_CODE, ensureDemoMatch, plantDemo } from "./demo-seed";

function guarded(handler) {
  return async (args) => {
    try {
      return { ok: true, ...(await handler(args)) };
    } catch (e) {
      return { ok: false, error: e?.message || "Something went wrong." };
    }
  };
}

const codeField = z.string().trim().toUpperCase();

async function findDemoMatch(sdk, code) {
  const matches = await list(sdk.asServiceRole.entities.Match.filter({ join_code: code }));
  return matches.find((m) => m.is_demo) || null;
}

function seatList(players) {
  return players.map((p) => ({
    id: p.id,
    name: p.display_name,
    token: p.participant_token,
  }));
}

/** Opens (or resumes) the fictional demo match. Only ever touches the demo match. */
export const startDemo = createServerFn({ method: "POST" })
  .validator(z.object({}).optional())
  .handler(
    guarded(async ({ context }) => {
      const sdk = context.getBase44();
      const { match, players } = await ensureDemoMatch(sdk);
      const startAs = players.find((p) => p.display_name === "Kai") || players[0];
      return {
        code: match.join_code || DEMO_CODE,
        token: startAs.participant_token,
        playerId: startAs.id,
        name: startAs.display_name,
        ownerToken: match.demo_owner_token || "",
        players: seatList(players),
      };
    })
  );

/** Tells the join screen whether a code is the demo, and which seats exist. */
export const demoSeats = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeField }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const match = await findDemoMatch(sdk, data.code);
      if (!match) return { isDemo: false, seats: [] };
      const players = await list(sdk.asServiceRole.entities.Player.filter({ match_id: match.id }));
      return {
        isDemo: true,
        seats: players.map((p) => ({ id: p.id, name: p.display_name })),
      };
    })
  );

/** Second device joins the demo by claiming one of the four fictional players. */
export const joinDemo = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeField, playerId: z.string().min(1) }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const match = await findDemoMatch(sdk, data.code);
      if (!match) fail("That's not a demo match.");
      const players = await list(s.entities.Player.filter({ match_id: match.id }));
      const player = players.find((p) => p.id === data.playerId);
      if (!player) fail("Pick one of the four demo players.");
      await s.entities.Player.update(player.id, { last_seen: new Date().toISOString() });
      return {
        code: match.join_code,
        token: player.participant_token,
        playerId: player.id,
        name: player.display_name,
        players: seatList(players),
      };
    })
  );

/** Restores the seeded demo state. Only the device that opened the demo holds the key. */
export const resetDemo = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeField, ownerToken: z.string().min(1) }))
  .handler(
    guarded(async ({ data, context }) => {
      const sdk = context.getBase44();
      const s = sdk.asServiceRole;
      const match = await findDemoMatch(sdk, data.code);
      if (!match) fail("That's not a demo match.");
      if (!match.demo_owner_token || match.demo_owner_token !== data.ownerToken) {
        fail("Only the host device that opened the demo can reset it.");
      }
      const players = await list(s.entities.Player.filter({ match_id: match.id }));
      await plantDemo(sdk, match, players);
      return { reset: true };
    })
  );
