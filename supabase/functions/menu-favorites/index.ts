import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PUT, PATCH, POST, DELETE, OPTIONS",
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

function normalizeAppId(value: unknown) {
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
    const { auth: supabase, admin } = getSupabaseClients(request);
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (request.method === "GET") {
      const { data, error } = await admin
        .from("menu_app_favorites")
        .select("app_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return jsonResponse(data ?? []);
    }

    const body = await readBody(request);
    const appId = normalizeAppId(body.app_id ?? body.appId);

    if (!appId) {
      return jsonResponse({ error: "Missing app_id." }, 400);
    }

    if (["PUT", "PATCH", "POST"].includes(request.method)) {
      const isFavorite = body.is_favorite ?? body.isFavorite ?? true;

      if (Boolean(isFavorite)) {
        const { data, error } = await admin
          .from("menu_app_favorites")
          .upsert({
            user_id: user.id,
            app_id: appId,
          }, {
            onConflict: "user_id,app_id",
          })
          .select("app_id")
          .single();

        if (error) throw error;
        return jsonResponse(data);
      }

      const { error } = await admin
        .from("menu_app_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("app_id", appId);

      if (error) throw error;
      return jsonResponse({ app_id: appId, is_favorite: false });
    }

    if (request.method === "DELETE") {
      const { error } = await admin
        .from("menu_app_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("app_id", appId);

      if (error) throw error;
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("menu-favorites function error", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
