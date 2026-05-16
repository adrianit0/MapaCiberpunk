import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function getSupabaseClients() {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnv("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return {
    auth: createClient(supabaseUrl, supabaseAnonKey),
    admin: createClient(supabaseUrl, supabaseServiceRoleKey),
  };
}

function normalizeProfileValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function assignDefaultUserRole(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: role, error: roleError } = await admin
    .from("rol")
    .select("id")
    .eq("name", "Usuario")
    .single();

  if (roleError) {
    return roleError;
  }

  const { error } = await admin
    .from("profile_rol")
    .upsert({
      rol_id: role.id,
      user_id: userId,
      date_start: new Date().toISOString().slice(0, 10),
      date_end: null,
    });

  return error;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await readBody(request);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = normalizeProfileValue(body.name);
    const username = normalizeProfileValue(body.username);

    if (!email || !password || !name || !username) {
      return jsonResponse({ error: "Email, password, name and username are required." }, 400);
    }

    const { auth, admin } = getSupabaseClients();
    const { data, error } = await auth.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          username,
        },
      },
    });

    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    if (data.user?.id) {
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .upsert({
          id: data.user.id,
          name,
          username,
          avatar_url: normalizeProfileValue(body.avatar_url),
        })
        .select("id, name, username, avatar_url")
        .single();

      if (profileError) {
        return jsonResponse({ error: profileError.message }, 400);
      }

      const defaultRoleError = await assignDefaultUserRole(admin, data.user.id);

      if (defaultRoleError) {
        return jsonResponse({ error: defaultRoleError.message }, 400);
      }

      return jsonResponse({
        ...data,
        profile,
      }, 201);
    }

    return jsonResponse(data, 201);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
