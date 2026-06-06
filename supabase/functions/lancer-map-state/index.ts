import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function readBody(request: Request) {
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function getSupabaseClients(request: Request) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  return {
    auth: createClient(supabaseUrl, getRequiredEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    }),
    admin: createClient(supabaseUrl, getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")),
  };
}

function normalizeRoleName(roleName: unknown) {
  return String(roleName ?? "").trim().toLowerCase();
}

function activeRoleFilter() {
  return `date_end.is.null,date_end.gte.${new Date().toISOString().slice(0, 10)}`;
}

async function getRoleNames(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: assignments, error: assignmentsError } = await admin
    .from("profile_rol")
    .select("rol_id")
    .eq("user_id", userId)
    .or(activeRoleFilter());

  if (assignmentsError) throw assignmentsError;
  const roleIds = [...new Set((assignments ?? []).map((assignment) => assignment.rol_id))];
  if (!roleIds.length) return [];

  const { data: roles, error: rolesError } = await admin
    .from("rol")
    .select("name")
    .in("id", roleIds);

  if (rolesError) throw rolesError;
  return (roles ?? []).map((role) => normalizeRoleName(role.name));
}

async function assertAdminOrMaster(admin: ReturnType<typeof createClient>, userId: string) {
  const roles = await getRoleNames(admin, userId);
  return roles.some((role) => role === "admin" || role === "master");
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeInteger(value: unknown) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : null;
}

async function getPayload(admin: ReturnType<typeof createClient>) {
  const { data: map, error: mapError } = await admin
    .from("lancer_maps")
    .select("id, name, image_path, image_url, image_width, image_height, grid_origin_x, grid_origin_y, hex_size, grid_rotation, is_active, updated_at")
    .eq("is_active", true)
    .maybeSingle();

  if (mapError) throw mapError;

  const { data: characters, error: charactersError } = await admin
    .from("lancer_characters")
    .select("id, name, image_path, image_url, updated_at")
    .order("name", { ascending: true });

  if (charactersError) throw charactersError;

  const { data: tokens, error: tokensError } = map?.id
    ? await admin
      .from("lancer_map_tokens")
      .select("id, map_id, character_id, q, r, label, updated_at")
      .eq("map_id", map.id)
      .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (tokensError) throw tokensError;

  return { map, characters: characters ?? [], tokens: tokens ?? [] };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { auth, admin } = getSupabaseClients(request);
    const { data: userData, error: userError } = await auth.auth.getUser();

    if (userError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    if (request.method === "GET") return jsonResponse(await getPayload(admin));

    if (!(await assertAdminOrMaster(admin, userData.user.id))) return jsonResponse({ error: "Forbidden" }, 403);

    const body = await readBody(request);

    if (request.method === "POST" || request.method === "PUT") {
      const mapId = normalizeText(body.map_id);
      const characterId = normalizeText(body.character_id);
      const q = normalizeInteger(body.q);
      const r = normalizeInteger(body.r);

      if (!mapId || !characterId || q === null || r === null) {
        return jsonResponse({ error: "map_id, character_id, q and r are required." }, 400);
      }

      const { error } = await admin
        .from("lancer_map_tokens")
        .upsert({
          map_id: mapId,
          character_id: characterId,
          q,
          r,
          label: normalizeText(body.label),
          created_by: userData.user.id,
        }, { onConflict: "map_id,character_id" });

      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse(await getPayload(admin));
    }

    if (request.method === "DELETE") {
      const tokenId = normalizeText(body.token_id);
      if (!tokenId) return jsonResponse({ error: "token_id is required." }, 400);

      const { error } = await admin.from("lancer_map_tokens").delete().eq("id", tokenId);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse(await getPayload(admin));
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("lancer-map-state function error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
