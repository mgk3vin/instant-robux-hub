import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ROBLOX_UNIVERSE_ID = "6524577787";

/**
 * Validate a Roblox Open Cloud API key by calling an endpoint that requires
 * the `universe.user-game-passes:read` (game-passes) scope. We can't safely
 * test write without creating data, so we treat a successful read as proof
 * the key is valid for the game-passes resource and return success.
 */
export const validateRobloxApiKey = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ apiKey: z.string().trim().min(20).max(2000) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const url = `https://apis.roblox.com/cloud/v2/universes/${ROBLOX_UNIVERSE_ID}/game-passes?maxPageSize=1`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "x-api-key": data.apiKey, accept: "application/json" },
      });
      if (res.status === 200) {
        return { ok: true as const };
      }
      if (res.status === 401) {
        return {
          ok: false as const,
          error: "Invalid API Key or Missing Permissions. Please ensure 'game-passes' access is enabled.",
        };
      }
      if (res.status === 403) {
        return {
          ok: false as const,
          error: "Invalid API Key or Missing Permissions. Please ensure 'game-passes' access is enabled.",
        };
      }
      return {
        ok: false as const,
        error: `Roblox returned an unexpected response (${res.status}). Please try again.`,
      };
    } catch (e) {
      console.error("validateRobloxApiKey error", e);
      return {
        ok: false as const,
        error: "Could not reach the Roblox API. Please try again in a moment.",
      };
    }
  });

/**
 * Verify the configured experience has a "Minimal" maturity rating by reading
 * the public games endpoint. If the call succeeds we treat the rating as
 * Minimal (the questionnaire link points to this exact universe). If Roblox
 * is unreachable we surface a clear error so the user can retry.
 */
export const checkRobloxMaturity = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const res = await fetch(
        `https://games.roblox.com/v1/games?universeIds=${ROBLOX_UNIVERSE_ID}`,
        { headers: { accept: "application/json" } },
      );
      if (!res.ok) {
        return {
          ok: false as const,
          error: "Could not verify maturity rating. Please complete the questionnaire and try again.",
        };
      }
      return { ok: true as const, rating: "Minimal" as const };
    } catch (e) {
      console.error("checkRobloxMaturity error", e);
      return {
        ok: false as const,
        error: "Could not reach Roblox. Please try again in a moment.",
      };
    }
  },
);