import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is super_admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claimsData.user.id;

    // Use service role to check super_admin status
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", callerUserId)
      .single();

    if (callerProfile?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get shop_id from request
    const { shop_id } = await req.json();
    if (!shop_id) {
      return new Response(JSON.stringify({ error: "shop_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find an admin user for this shop (priority: admin > shop_admin > any)
    const { data: shopProfiles } = await adminClient
      .from("profiles")
      .select("user_id, role")
      .eq("shop_id", shop_id)
      .in("role", ["admin", "shop_admin", "technician"])
      .order("role");

    // Sort by priority
    const priorityOrder = ["admin", "shop_admin", "technician"];
    const sorted = (shopProfiles || []).sort(
      (a, b) => priorityOrder.indexOf(a.role) - priorityOrder.indexOf(b.role)
    );

    const targetProfile = sorted[0];
    if (!targetProfile?.user_id) {
      return new Response(
        JSON.stringify({ error: "Aucun utilisateur trouvé pour cette boutique" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check that target user exists in auth.users
    const { data: targetUser, error: targetUserError } = await adminClient.auth.admin.getUserById(
      targetProfile.user_id
    );

    if (targetUserError || !targetUser?.user) {
      return new Response(
        JSON.stringify({ error: "Utilisateur cible introuvable dans auth" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate a magic link for this user
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.user.email!,
      options: {
        redirectTo: "https://sav-pro-fix.lovable.app/dashboard",
      },
    });

    if (linkError || !linkData) {
      console.error("Error generating magic link:", linkError);
      return new Response(
        JSON.stringify({ error: "Impossible de générer le lien de connexion" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // The generateLink returns properties including hashed_token
    // We need to construct the verification URL
    const verificationUrl = `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=https://sav-pro-fix.lovable.app/dashboard`;

    return new Response(
      JSON.stringify({
        url: verificationUrl,
        shop_name: targetUser.user.email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
