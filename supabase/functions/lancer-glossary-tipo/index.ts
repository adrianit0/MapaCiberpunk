import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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

async function readBody(request: Request) {
  const text = await request.text();
  return text ? JSON.parse(text) : {};
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

async function getAuthenticatedUser(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function isAdmin(admin: ReturnType<typeof createClient>, userId: string) {
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

  return (roles ?? []).some((role) => normalizeRoleName(role.name) === "admin");
}

function getIdFromRequest(request: Request, body: Record<string, unknown>) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? body.id;
  const parsedId = Number(id);
  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
}

function normalizePayload(body: Record<string, unknown>) {
  return {
    name: body.name,
    color: body.color,
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
    const { auth, admin } = getSupabaseClients(request);

    if (request.method === "GET") {
      const { data, error } = await admin
        .from("lancer_glossary_tipo")
        .select("id, name, color")
        .order("id", { ascending: true });

      if (error) throw error;
      return jsonResponse(data ?? []);
    }

    const user = await getAuthenticatedUser(auth);
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userIsAdmin = await isAdmin(admin, user.id);
    if (!userIsAdmin) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await readBody(request);

    if (request.method === "POST") {
      const { data, error } = await admin
        .from("lancer_glossary_tipo")
        .insert(normalizePayload(body))
        .select("id, name, color")
        .single();

      if (error) throw error;
      return jsonResponse(data, 201);
    }

    if (["PUT", "PATCH"].includes(request.method)) {
      const id = getIdFromRequest(request, body);

      if (!id) {
        return jsonResponse({ error: "Missing glossary type id." }, 400);
      }

      const { data, error } = await admin
        .from("lancer_glossary_tipo")
        .update(normalizePayload(body))
        .eq("id", id)
        .select("id, name, color")
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (request.method === "DELETE") {
      const id = getIdFromRequest(request, body);

      if (!id) {
        return jsonResponse({ error: "Missing glossary type id." }, 400);
      }

      const { error } = await admin
        .from("lancer_glossary_tipo")
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
    console.error("lancer-glossary-tipo function error", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
