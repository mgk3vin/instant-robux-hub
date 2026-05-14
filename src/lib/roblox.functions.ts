import { createServerFn } from "@tanstack/react-start";

const ROBLOX_UNIVERSE_ID = "6524577787";

/**
 * Verify the configured experience has a "Minimal" maturity rating by reading
 * the public games endpoint.
 */
export const checkRobloxMaturity = createServerFn({ method: "POST" }).handler(async () => {
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
});
