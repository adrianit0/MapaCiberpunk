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

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        {
            global: {
                headers: {
                    Authorization: req.headers.get("Authorization") ?? "",
                },
            },
        },
    );

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

    if (req.method === "GET") {
        const { data, error } = await supabase
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
      `)
            .or(`visibility.eq.1,and(visibility.eq.2,user_id.eq.${user.id})`)
            .order("id");

        if (error) {
            return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
        }

        return Response.json(data, { headers: corsHeaders });
    }

    if (req.method === "POST") {
        const body = await req.json();

        const { data, error } = await supabase
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

        const { data, error } = await supabase
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
            .eq("id", body.id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
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

        const { error } = await supabase
            .from("cyber_location")
            .delete()
            .eq("id", body.id)
            .eq("user_id", user.id);

        if (error) {
            return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
        }

        return Response.json({ success: true }, { headers: corsHeaders });
    }

    return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
    });
});