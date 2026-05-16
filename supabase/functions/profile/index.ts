import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PUT, PATCH, OPTIONS",
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

function getSupabaseClients(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

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

function normalizeProfileValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function getProfileWithRoles(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, name, username, avatar_url")
    .eq("id", userId)
    .single();

  if (profileError) {
    return { data: null, error: profileError };
  }

  const { data: assignedRoles, error: assignmentsError } = await admin
    .from("profile_rol")
    .select("rol_id, date_start, date_end")
    .eq("user_id", userId)
    .order("date_start", { ascending: false });

  if (assignmentsError) {
    return { data: null, error: assignmentsError };
  }

  const roleIds = [...new Set((assignedRoles ?? []).map((assignment) => assignment.rol_id))];
  const { data: roles, error: rolesError } = roleIds.length
    ? await admin
      .from("rol")
      .select("id, name, description")
      .in("id", roleIds)
    : { data: [], error: null };

  if (rolesError) {
    return { data: null, error: rolesError };
  }

  const rolesById = new Map((roles ?? []).map((role) => [role.id, role]));

  return {
    data: {
      ...profile,
      roles: (assignedRoles ?? [])
        .map((assignment) => {
          const role = rolesById.get(assignment.rol_id);

          return role
            ? {
              id: role.id,
              name: role.name,
              description: role.description,
              date_start: assignment.date_start,
              date_end: assignment.date_end,
            }
            : null;
        })
        .filter(Boolean),
    },
    error: null,
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
    const { data: userData, error: userError } = await auth.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (request.method === "GET") {
      const { data, error } = await getProfileWithRoles(admin, userData.user.id);

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      return jsonResponse(data);
    }

    if (request.method === "PUT" || request.method === "PATCH") {
      const body = await readBody(request);
      const name = normalizeProfileValue(body.name);
      const username = normalizeProfileValue(body.username);

      if (!name || !username) {
        return jsonResponse({ error: "Name and username are required." }, 400);
      }

      const { data, error } = await admin
        .from("profiles")
        .upsert({
          id: userData.user.id,
          name,
          username,
          avatar_url: normalizeProfileValue(body.avatar_url),
        })
        .select("id, name, username, avatar_url")
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      const { data: profileWithRoles, error: profileWithRolesError } = await getProfileWithRoles(admin, data.id);

      if (profileWithRolesError) {
        return jsonResponse({ error: profileWithRolesError.message }, 400);
      }

      return jsonResponse(profileWithRoles);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("profile function error", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
