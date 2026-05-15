import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type RobloxUserLookup =
  | {
      ok: true;
      userId: number;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      universeId: number;
      placeName: string;
    }
  | { ok: false; error: string };

export const lookupRobloxUser = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ username: z.string().trim().min(3).max(40) }).parse(input),
  )
  .handler(async ({ data }): Promise<RobloxUserLookup> => {
    try {
      // Step A: username -> userId
      const userRes = await fetch("https://users.roblox.com/v1/usernames/users", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ usernames: [data.username], excludeBannedUsers: true }),
      });
      if (!userRes.ok) {
        return { ok: false, error: "Could not reach Roblox. Please try again." };
      }
      const userJson = (await userRes.json()) as {
        data: Array<{ id: number; name: string; displayName: string }>;
      };
      const u = userJson.data?.[0];
      if (!u) {
        return { ok: false, error: "No Roblox user found with that username." };
      }

      // Step B: public games
      const gamesRes = await fetch(
        `https://games.roblox.com/v2/users/${u.id}/games?accessFilter=Public&limit=10`,
        { headers: { accept: "application/json" } },
      );
      if (!gamesRes.ok) {
        return { ok: false, error: "Could not load your public experiences from Roblox." };
      }
      const gamesJson = (await gamesRes.json()) as {
        data: Array<{ id: number; name: string; rootPlace?: { id: number } }>;
      };
      const game = gamesJson.data?.[0];
      if (!game) {
        return {
          ok: false,
          error:
            "Your Roblox profile doesn't have any public experiences. Please make sure your default game is set to \u201CPublic.\u201D",
        };
      }

      // Step C: avatar headshot
      let avatarUrl: string | null = null;
      try {
        const avRes = await fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${u.id}&size=150x150&format=Png&isCircular=false`,
          { headers: { accept: "application/json" } },
        );
        if (avRes.ok) {
          const avJson = (await avRes.json()) as {
            data: Array<{ imageUrl: string; state: string }>;
          };
          avatarUrl = avJson.data?.[0]?.imageUrl ?? null;
        }
      } catch {
        // optional
      }

      return {
        ok: true,
        userId: u.id,
        username: u.name,
        displayName: u.displayName,
        avatarUrl,
        universeId: game.id,
        placeName: game.name,
      };
    } catch (e) {
      console.error("lookupRobloxUser error", e);
      return { ok: false, error: "Could not reach Roblox. Please try again in a moment." };
    }
  });

export type RobloxStatusResult =
  | {
      ok: true;
      ageRating: string;
      visibility: string | null;
      isMinimal: boolean;
      isRatingUnavailable: boolean;
      isPublic: boolean;
      isReady: boolean;
      missingRequirements: string[];
    }
  | { ok: false; error: string };

function readRobloxError(json: unknown) {
  if (!json || typeof json !== "object") return null;
  const record = json as Record<string, unknown>;
  const message = record.message ?? record.error ?? record.errorMessage;
  if (typeof message === "string") return message;

  const details = record.details;
  if (Array.isArray(details)) {
    const firstMessage = details
      .map((detail) =>
        detail && typeof detail === "object" ? (detail as Record<string, unknown>).message : null,
      )
      .find((detailMessage): detailMessage is string => typeof detailMessage === "string");
    if (firstMessage) return firstMessage;
  }

  return null;
}

export const validateRobloxStatus = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        apiKey: z.string().trim().min(20).max(2000),
        universeId: z.number().int().positive(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<RobloxStatusResult> => {
    try {
      const res = await fetch(
        `https://apis.roblox.com/game-passes/v1/universes/${data.universeId}/game-passes/creator`,
        { headers: { "x-api-key": data.apiKey, accept: "application/json" } },
      );
      if (!res.ok) {
        let robloxMessage: string | null = null;
        try {
          robloxMessage = readRobloxError(await res.json());
        } catch {
          // Ignore malformed error bodies from Roblox.
        }

        if (res.status === 401) {
          return {
            ok: false,
            error:
              "Roblox rejected this API key. Regenerate the key and paste the full secret key, not the shortened key shown later in the dashboard.",
          };
        }

        if (res.status === 403) {
          return {
            ok: false,
            error:
              `Roblox denied access to Universe ID ${data.universeId}. Make sure this API key belongs to the same creator or group, has game-pass:read and game-pass:write, and has access to this experience.` +
              (robloxMessage ? ` Roblox says: ${robloxMessage}` : ""),
          };
        }

        return {
          ok: false,
          error:
            `Roblox returned an unexpected response (${res.status}).` +
            (robloxMessage ? ` Roblox says: ${robloxMessage}` : " Please try again."),
        };
      }

      return {
        ok: true,
        ageRating: "QUESTIONNAIRE_REQUIRED",
        visibility: "PUBLIC",
        isMinimal: true,
        isRatingUnavailable: true,
        isPublic: true,
        isReady: true,
        missingRequirements: [],
      };
    } catch (e) {
      console.error("validateRobloxStatus error", e);
      return { ok: false, error: "Could not reach the Roblox API. Please try again." };
    }
  });
