import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      console.error("Authentication error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Get user's shop_id
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("shop_id")
      .eq("user_id", userData.user.id)
      .single();

    if (!profile?.shop_id) {
      return new Response(JSON.stringify({ error: "Shop not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const body = await req.json();
    const {
      original_prompt,
      ai_interpretation,
      name,
      description,
      widget_type,
      chart_type,
      data_source,
      data_config,
      display_config,
    } = body;

    // Validation
    if (!original_prompt || !name || !widget_type || !data_source || !data_config) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Saving custom widget:", name);

    // Get the current max display_order for this shop
    const { data: maxOrderData } = await supabaseClient
      .from("custom_widgets")
      .select("display_order")
      .eq("shop_id", profile.shop_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderData?.display_order ?? 0) + 1;

    // Insert the custom widget
    const { data: newWidget, error: insertError } = await supabaseClient
      .from("custom_widgets")
      .insert({
        shop_id: profile.shop_id,
        name,
        description,
        original_prompt,
        ai_interpretation: ai_interpretation || {},
        widget_type,
        chart_type: chart_type || null,
        data_source,
        data_config,
        display_config: display_config || {},
        enabled: true,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting custom widget:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save widget" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("Custom widget saved successfully:", newWidget.id);

    return new Response(
      JSON.stringify({ widget: newWidget }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in save-custom-widget:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});