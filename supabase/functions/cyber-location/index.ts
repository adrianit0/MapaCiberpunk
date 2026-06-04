import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const parseVisibility = (value: unknown) => {
    const visibility = Number(value ?? 2);
    return visibility === 1 || visibility === 2 ? visibility : 2;
};

function getRequiredEnv(name: string) {
    const value = Deno.env.get(name);

    if (!value) {
        throw new Error(`${name} is not configured.`);
    }

    return value;
}

function normalizeRoleName(roleName: unknown) {
    return String(roleName ?? "").trim().toLowerCase();
}

function activeRoleFilter() {
    return `date_end.is.null,date_end.gte.${new Date().toISOString().slice(0, 10)}`;
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

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseAnonKey = getRequiredEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            global: {
                headers: {
                    Authorization: req.headers.get("Authorization") ?? "",
                },
            },
        },
    );
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401, headers: corsHeaders },
        );
    }

    const userIsAdmin = await isAdmin(admin, user.id);

    if (req.method === "GET") {
        let query = admin
            .from("cyber_location")
            .select(`
        id,
        type_id,
        user_id,
        x,
        y,
        title,
        info,
        reference,
        editable,
        visibility,
        cyber_location_type (
          id,
          name,
          color
        )
      `);

        if (!userIsAdmin) {
            query = query.or(`visibility.eq.1,and(visibility.eq.2,user_id.eq.${user.id})`);
        }

        const { data, error } = await query.order("id");

        if (error) {
            return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
        }

        return Response.json(data, { headers: corsHeaders });
    }

    if (req.method === "POST") {
        const body = await req.json();

        const { data, error } = await admin
            .from("cyber_location")
            .insert({
                type_id: body.type_id,
                user_id: user.id,
                x: body.x,
                y: body.y,
                title: body.title,
                info: body.info ?? null,
                reference: body.reference ?? null,
                editable: body.editable ?? true,
                visibility: parseVisibility(body.visibility),
            })
            .select()
            .single();

        if (error) {
            return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
        }

        return Response.json(data, { status: 201, headers: corsHeaders });
    }

    if (req.method === "PUT") {
        const body = await req.json();

        if (!body.id) {
            return Response.json(
                { error: "Missing location id" },
                { status: 400, headers: corsHeaders },
            );
        }

        let query = admin
            .from("cyber_location")
            .update({
                type_id: body.type_id,
                x: body.x,
                y: body.y,
                title: body.title,
                info: body.info ?? null,
                reference: body.reference ?? null,
                editable: body.editable,
                visibility: parseVisibility(body.visibility),
            })
            .eq("id", body.id);

        if (!userIsAdmin) {
            query = query.eq("user_id", user.id);
        }

        const { data, error } = await query
            .select()
            .maybeSingle();

        if (error) {
            return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
        }

        if (!data) {
            return Response.json(
                { error: "Location not found or not editable by this user" },
                { status: 404, headers: corsHeaders },
            );
        }

        return Response.json(data, { headers: corsHeaders });
    }

    if (req.method === "DELETE") {
        const body = await req.json();

        if (!body.id) {
            return Response.json(
                { error: "Missing location id" },
                { status: 400, headers: corsHeaders },
            );
        }

        let query = admin
            .from("cyber_location")
            .delete()
            .eq("id", body.id);

        if (!userIsAdmin) {
            query = query.eq("user_id", user.id);
        }

        const { data, error } = await query
            .select("id")
            .maybeSingle();

        if (error) {
            return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
        }

        if (!data) {
            return Response.json(
                { error: "Location not found or not editable by this user" },
                { status: 404, headers: corsHeaders },
            );
        }

        return Response.json({ success: true }, { headers: corsHeaders });
    }

    return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
    });
});
