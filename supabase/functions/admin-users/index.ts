import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
  return String(roleName ?? "").trim().toLowerCase();
}

function activeRoleFilter() {
  return `date_end.is.null,date_end.gte.${new Date().toISOString().slice(0, 10)}`;
}

async function assertAdmin(admin: ReturnType<typeof createClient>, userId: string) {
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

async function listAuthUsers(admin: ReturnType<typeof createClient>) {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    users.push(...(data.users ?? []));

    if (!data.users || data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function getPayload(admin: ReturnType<typeof createClient>) {
  const authUsers = await listAuthUsers(admin);
  const userIds = authUsers.map((user) => user.id);

  const { data: profiles, error: profilesError } = userIds.length
    ? await admin
      .from("profiles")
      .select("id, name, username, avatar_url")
      .in("id", userIds)
    : { data: [], error: null };

  if (profilesError) {
    throw profilesError;
  }

  const { data: roles, error: rolesError } = await admin
    .from("rol")
    .select("id, name, description")
    .order("name", { ascending: true });

  if (rolesError) {
    throw rolesError;
  }

  const { data: assignments, error: assignmentsError } = userIds.length
    ? await admin
      .from("profile_rol")
      .select("rol_id, user_id, date_start, date_end")
      .in("user_id", userIds)
      .or(activeRoleFilter())
      .order("date_start", { ascending: false })
    : { data: [], error: null };

  if (assignmentsError) {
    throw assignmentsError;
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const rolesById = new Map((roles ?? []).map((role) => [role.id, role]));
  const assignmentsByUserId = new Map<string, any[]>();

  (assignments ?? []).forEach((assignment) => {
    const current = assignmentsByUserId.get(assignment.user_id) ?? [];
    current.push(assignment);
    assignmentsByUserId.set(assignment.user_id, current);
  });

  return {
    roles: roles ?? [],
    users: authUsers.map((user) => {
      const profile = profilesById.get(user.id) ?? {};
      const userAssignments = assignmentsByUserId.get(user.id) ?? [];

      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        ...profile,
        roles: userAssignments
          .map((assignment) => {
            const role = rolesById.get(assignment.rol_id);
            return role
              ? {
                ...role,
                date_start: assignment.date_start,
                date_end: assignment.date_end,
              }
              : null;
          })
          .filter(Boolean),
      };
    }),
  };
}

function normalizeId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeRoleId(value: unknown) {
  const roleId = Number(value);
  return Number.isInteger(roleId) && roleId > 0 ? roleId : null;
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

    const isAdmin = await assertAdmin(admin, userData.user.id);
    if (!isAdmin) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    if (request.method === "GET") {
      return jsonResponse(await getPayload(admin));
    }

    const body = await readBody(request);
    const userId = normalizeId(body.user_id);
    const roleId = normalizeRoleId(body.rol_id);

    if (!userId || !roleId) {
      return jsonResponse({ error: "user_id and rol_id are required." }, 400);
    }

    if (request.method === "POST") {
      const { error } = await admin
        .from("profile_rol")
        .upsert({
          user_id: userId,
          rol_id: roleId,
          date_start: new Date().toISOString().slice(0, 10),
          date_end: null,
        });

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      return jsonResponse(await getPayload(admin));
    }

    if (request.method === "DELETE") {
      const { error } = await admin
        .from("profile_rol")
        .delete()
        .eq("user_id", userId)
        .eq("rol_id", roleId);

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      return jsonResponse(await getPayload(admin));
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("admin-users function error", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
