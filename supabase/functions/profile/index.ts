import { createClient } from "npm:@supabase/supabase-js@2";

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
      const { data, error } = await admin
        .from("profiles")
        .select("id, name, username, avatar_url")
        .eq("id", userData.user.id)
        .single();

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

      return jsonResponse(data);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
