import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "GET") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
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

    const { data, error } = await supabase
        .from("cyber_location_type")
        .select("id, name, color")
        .order("id");

    if (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
    }

    return Response.json(data, { headers: corsHeaders });
});