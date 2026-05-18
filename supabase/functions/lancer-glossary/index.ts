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

type TranslationPayload = {
  language_id?: unknown;
  name?: unknown;
  description?: unknown;
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

function normalizeGlossaryPayload(body: Record<string, unknown>, userId: string) {
  return {
    user_id: userId,
    type_id: body.type_id,
    date: body.date ?? new Date().toISOString().slice(0, 10),
  };
}

function normalizeTranslationPayload(glossaryId: number, translation: TranslationPayload) {
  const languageId = Number(translation.language_id);

  if (!Number.isInteger(languageId) || languageId <= 0) {
    throw new Error("translation.language_id is required.");
  }

  return {
    glossary_id: glossaryId,
    language_id: languageId,
    name: translation.name,
    description: translation.description ?? null,
  };
}

async function getGlossaries(admin: ReturnType<typeof createClient>, id?: number | null) {
  let query = admin
    .from("lancer_glossary")
    .select(`
      id,
      user_id,
      type_id,
      date,
      lancer_glossary_tipo (
        id,
        name,
        color
      ),
      translations:lancer_glossary_translation (
        glossary_id,
        language_id,
        name,
        description,
        language (
          id,
          name
        )
      )
    `)
    .order("date", { ascending: false });

  if (id) {
    query = query.eq("id", id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function replaceTranslations(
  admin: ReturnType<typeof createClient>,
  glossaryId: number,
  translations: unknown,
) {
  if (!Array.isArray(translations)) {
    return;
  }

  const { error: deleteError } = await admin
    .from("lancer_glossary_translation")
    .delete()
    .eq("glossary_id", glossaryId);

  if (deleteError) {
    throw deleteError;
  }

  if (translations.length === 0) {
    return;
  }

  const payload = translations.map((translation) =>
    normalizeTranslationPayload(glossaryId, translation as TranslationPayload)
  );

  const { error: insertError } = await admin
    .from("lancer_glossary_translation")
    .insert(payload);

  if (insertError) {
    throw insertError;
  }
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
      const url = new URL(request.url);
      const id = Number(url.searchParams.get("id"));
      const data = await getGlossaries(admin, Number.isInteger(id) && id > 0 ? id : null);
      return jsonResponse(data);
    }

    const user = await getAuthenticatedUser(auth);
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await readBody(request);

    if (request.method === "POST") {
      const { data, error } = await admin
        .from("lancer_glossary")
        .insert(normalizeGlossaryPayload(body, user.id))
        .select("id")
        .single();

      if (error) throw error;

      await replaceTranslations(admin, data.id, body.translations);
      return jsonResponse((await getGlossaries(admin, data.id))[0] ?? data, 201);
    }

    if (["PUT", "PATCH"].includes(request.method)) {
      const id = getIdFromRequest(request, body);

      if (!id) {
        return jsonResponse({ error: "Missing glossary id." }, 400);
      }

      const userIsAdmin = await isAdmin(admin, user.id);
      const payload = {
        type_id: body.type_id,
        date: body.date ?? new Date().toISOString().slice(0, 10),
      };

      let query = admin
        .from("lancer_glossary")
        .update(payload)
        .eq("id", id);

      if (!userIsAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      await replaceTranslations(admin, id, body.translations);
      return jsonResponse((await getGlossaries(admin, id))[0]);
    }

    if (request.method === "DELETE") {
      const id = getIdFromRequest(request, body);

      if (!id) {
        return jsonResponse({ error: "Missing glossary id." }, 400);
      }

      const userIsAdmin = await isAdmin(admin, user.id);
      let query = admin
        .from("lancer_glossary")
        .delete()
        .eq("id", id);

      if (!userIsAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("lancer-glossary function error", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
