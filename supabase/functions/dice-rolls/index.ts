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

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function getSupabaseClients(request: Request) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnv("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return {
    auth: createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: request.headers.get("Authorization") ?? "",
        },
      },
    }),
    admin: createClient(supabaseUrl, supabaseServiceRoleKey),
  };
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

function normalizeRoleName(roleName: unknown) {
  return String(roleName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function activeRoleFilter() {
  return `date_end.is.null,date_end.gte.${new Date().toISOString().slice(0, 10)}`;
}

async function userCanDeleteDiceRolls(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: assignments, error: assignmentsError } = await admin
    .from("profile_rol")
    .select("rol_id, date_end")
    .eq("user_id", userId)
    .or(activeRoleFilter());

  if (assignmentsError) {
    throw assignmentsError;
  }

  const roleIds = [...new Set((assignments ?? []).map((assignment) => assignment.rol_id))];
  if (roleIds.length === 0) {
    return false;
  }

  const { data: roles, error: rolesError } = await admin
    .from("rol")
    .select("name")
    .in("id", roleIds);

  if (rolesError) {
    throw rolesError;
  }

  return (roles ?? [])
    .some((role) => ["admin", "master"].includes(normalizeRoleName(role.name)));
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
    const { auth: supabase, admin } = getSupabaseClients(request);
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (request.method === "GET") {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      let query = supabase
        .from("dice_rolls")
        .select("*, profiles!dice_rolls_user_id_profiles_fkey(name, username, avatar_url)")
        .order("rolled_at", { ascending: false });

      if (id) {
        query = query.eq("id", id);
      } else {
        query = query.limit(20);
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
        .select("*, profiles!dice_rolls_user_id_profiles_fkey(name, username, avatar_url)")
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
        .select("*, profiles!dice_rolls_user_id_profiles_fkey(name, username, avatar_url)")
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (request.method === "DELETE") {
      const canDelete = await userCanDeleteDiceRolls(admin, user.id);
      if (!canDelete) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const id = getIdFromRequest(request, body);

      if (!id) {
        return jsonResponse({ error: "Missing dice roll id." }, 400);
      }

      const { error } = await admin
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
