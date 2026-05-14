import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IntrospectResponse {
  isValid?: boolean;
  isEnabled?: boolean;
  isExpired?: boolean;
  scopes?: string[];
  apiBans?: unknown[];
  resources?: unknown[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const apiKey: string = body?.apiKey ?? "";

    if (!apiKey || apiKey.trim().length < 20) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid API key format.", code: "INVALID_FORMAT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call Roblox Open Cloud introspect endpoint
    const introspectRes = await fetch("https://apis.roblox.com/api-keys/v1/introspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKey.trim() }),
    });

    if (!introspectRes.ok) {
      if (introspectRes.status === 401 || introspectRes.status === 403) {
        return new Response(
          JSON.stringify({ ok: false, error: "Invalid API Key. Please check and try again.", code: "INVALID_KEY" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (introspectRes.status === 404) {
        return new Response(
          JSON.stringify({ ok: false, error: "API Key not found. Ensure it was created correctly.", code: "NOT_FOUND" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ ok: false, error: `Roblox API error (${introspectRes.status}). Please try again.`, code: "ROBLOX_ERROR" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data: IntrospectResponse = await introspectRes.json();

    // Key must be valid and enabled
    if (data.isValid === false) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid API Key. It may have been revoked.", code: "INVALID_KEY" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (data.isEnabled === false) {
      return new Response(
        JSON.stringify({ ok: false, error: "API Key is disabled. Re-enable it in the Roblox Creator Dashboard.", code: "KEY_DISABLED" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (data.isExpired === true) {
      return new Response(
        JSON.stringify({ ok: false, error: "API Key has expired. Create a new key in the Roblox Creator Dashboard.", code: "KEY_EXPIRED" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check for game-passes scopes
    const scopes: string[] = data.scopes ?? [];
    const scopeStr = scopes.join(" ").toLowerCase();
    const hasGamePassRead = scopeStr.includes("game-passes") || scopeStr.includes("game_passes") || scopeStr.includes("gamepasses");

    if (!hasGamePassRead) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing Game Passes permission. Add 'Game Passes API' with read & write access in the Roblox Creator Dashboard.",
          code: "MISSING_PERMISSIONS",
          scopes,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, scopes }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("validate-roblox-key error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Could not reach Roblox API. Please try again.", code: "NETWORK_ERROR" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
