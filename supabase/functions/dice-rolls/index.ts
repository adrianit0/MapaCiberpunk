import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, PUSH, DELETE, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function getSupabaseClient(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: request.headers.get("Authorization") ?? "",
      },
    },
  });
}

async function getAuthenticatedUser(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function readBody(request: Request) {
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

function getIdFromRequest(request: Request, body: Record<string, unknown>) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? body.id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function normalizePayload(body: Record<string, unknown>, userId: string) {
  return {
    "userId": userId,
    preset_id: body.preset_id,
    preset_label: body.preset_label,
    roll_mode: body.roll_mode,
    formula: body.formula,
    counts: body.counts ?? {},
    bonus: body.bonus ?? 0,
    groups: body.groups ?? [],
    total: body.total,
    breakdown: body.breakdown ?? null,
    result_type: body.result_type ?? null,
    rolled_at: body.rolled_at ?? new Date().toISOString(),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = getSupabaseClient(request);
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (request.method === "GET") {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      let query = supabase
        .from("dice_rolls")
        .select("*, profiles!dice_rolls_user_id_profiles_fkey(username, avatar_url)")
        .order("rolled_at", { ascending: false });

      if (id) {
        query = query.eq("id", id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return jsonResponse(data ?? []);
    }

    const body = await readBody(request);

    if (request.method === "POST") {
      const payload = normalizePayload(body, user.id);
      const { data, error } = await supabase
        .from("dice_rolls")
        .insert(payload)
        .select("*, profiles!dice_rolls_user_id_profiles_fkey(username, avatar_url)")
        .single();

      if (error) throw error;
      return jsonResponse(data, 201);
    }

    if (["PUT", "PATCH", "PUSH"].includes(request.method)) {
      const id = getIdFromRequest(request, body);

      if (!id) {
        return jsonResponse({ error: "Missing dice roll id." }, 400);
      }

      const payload = normalizePayload(body, user.id);
      const { data, error } = await supabase
        .from("dice_rolls")
        .update(payload)
        .eq("id", id)
        .select("*, profiles!dice_rolls_user_id_profiles_fkey(username, avatar_url)")
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (request.method === "DELETE") {
      const id = getIdFromRequest(request, body);

      if (!id) {
        return jsonResponse({ error: "Missing dice roll id." }, 400);
      }

      const { error } = await supabase
        .from("dice_rolls")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
