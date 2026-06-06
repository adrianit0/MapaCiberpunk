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

function normalizePositiveNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

async function getPayload(admin: ReturnType<typeof createClient>) {
  const { data: maps, error: mapsError } = await admin
    .from("lancer_maps")
    .select("id, name, image_path, image_url, image_width, image_height, grid_origin_x, grid_origin_y, hex_size, grid_rotation, is_active, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (mapsError) throw mapsError;

  const { data: characters, error: charactersError } = await admin
    .from("lancer_characters")
    .select("id, name, image_path, image_url, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (charactersError) throw charactersError;

  return { maps: maps ?? [], characters: characters ?? [] };
}

async function setActiveMap(admin: ReturnType<typeof createClient>, mapId: string) {
  const { error: deactivateError } = await admin
    .from("lancer_maps")
    .update({ is_active: false })
    .neq("id", mapId);

  if (deactivateError) throw deactivateError;

  const { error: activateError } = await admin
    .from("lancer_maps")
    .update({ is_active: true })
    .eq("id", mapId);

  if (activateError) throw activateError;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { auth, admin } = getSupabaseClients(request);
    const { data: userData, error: userError } = await auth.auth.getUser();

    if (userError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);
    if (!(await assertAdminOrMaster(admin, userData.user.id))) return jsonResponse({ error: "Forbidden" }, 403);

    if (request.method === "GET") return jsonResponse(await getPayload(admin));

    const body = await readBody(request);
    const action = normalizeText(body.action);

    if (request.method === "POST" && action === "map") {
      const name = normalizeText(body.name);
      const imagePath = normalizeText(body.image_path);
      if (!name || !imagePath) return jsonResponse({ error: "name and image_path are required." }, 400);
      const isActive = Boolean(body.is_active);

      if (isActive) {
        const { error: deactivateError } = await admin
          .from("lancer_maps")
          .update({ is_active: false })
          .eq("is_active", true);

        if (deactivateError) return jsonResponse({ error: deactivateError.message }, 400);
      }

      const { data, error } = await admin
        .from("lancer_maps")
        .insert({
          created_by: userData.user.id,
          name,
          image_path: imagePath,
          image_url: normalizeText(body.image_url),
          image_width: Math.round(normalizePositiveNumber(body.image_width, 1600)),
          image_height: Math.round(normalizePositiveNumber(body.image_height, 1000)),
          grid_origin_x: normalizeNumber(body.grid_origin_x),
          grid_origin_y: normalizeNumber(body.grid_origin_y),
          hex_size: normalizePositiveNumber(body.hex_size, 52),
          grid_rotation: normalizeNumber(body.grid_rotation),
          is_active: isActive,
        })
        .select("id, is_active")
        .single();

      if (error) return jsonResponse({ error: error.message }, 400);
      if (data?.is_active) await setActiveMap(admin, data.id);
      return jsonResponse(await getPayload(admin));
    }

    if (request.method === "POST" && action === "character") {
      const name = normalizeText(body.name);
      const imagePath = normalizeText(body.image_path);
      if (!name || !imagePath) return jsonResponse({ error: "name and image_path are required." }, 400);

      const { error } = await admin
        .from("lancer_characters")
        .insert({
          created_by: userData.user.id,
          name,
          image_path: imagePath,
          image_url: normalizeText(body.image_url),
        });

      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse(await getPayload(admin));
    }

    if (request.method === "PUT" && action === "map") {
      const id = normalizeText(body.id);
      if (!id) return jsonResponse({ error: "id is required." }, 400);

      const patch: Record<string, unknown> = {
        name: normalizeText(body.name),
        grid_origin_x: normalizeNumber(body.grid_origin_x),
        grid_origin_y: normalizeNumber(body.grid_origin_y),
        hex_size: normalizePositiveNumber(body.hex_size, 52),
        grid_rotation: normalizeNumber(body.grid_rotation),
        image_width: Math.round(normalizePositiveNumber(body.image_width, 1600)),
        image_height: Math.round(normalizePositiveNumber(body.image_height, 1000)),
        is_active: Boolean(body.is_active),
      };

      Object.keys(patch).forEach((key) => patch[key] == null && delete patch[key]);
      if (patch.is_active) {
        const { error: deactivateError } = await admin
          .from("lancer_maps")
          .update({ is_active: false })
          .neq("id", id);

        if (deactivateError) return jsonResponse({ error: deactivateError.message }, 400);
      }

      const { error } = await admin.from("lancer_maps").update(patch).eq("id", id);
      if (error) return jsonResponse({ error: error.message }, 400);
      if (patch.is_active) await setActiveMap(admin, id);
      return jsonResponse(await getPayload(admin));
    }

    if (request.method === "DELETE") {
      const id = normalizeText(body.id);
      const target = normalizeText(body.target);
      if (!id || !target) return jsonResponse({ error: "target and id are required." }, 400);

      const table = target === "map" ? "lancer_maps" : target === "character" ? "lancer_characters" : null;
      if (!table) return jsonResponse({ error: "Invalid target." }, 400);

      const { error } = await admin.from(table).delete().eq("id", id);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse(await getPayload(admin));
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("lancer-map-admin function error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
