import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INACTIVITY_DAYS = 60;
const WARNING_DAYS_BEFORE = 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // 1. Check alert toggle
    const { data: alert } = await supabase
      .from("system_alerts")
      .select("*")
      .eq("alert_type", "inactive_shop_cleanup")
      .maybeSingle();

    if (!alert || !alert.is_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const thresholdDays = Number(alert.threshold_value || INACTIVITY_DAYS);
    const warningCutoffMs = (thresholdDays - WARNING_DAYS_BEFORE) * 86400000;
    const deletionCutoffMs = thresholdDays * 86400000;

    const { data: shops, error: shopsErr } = await supabase
      .from("shops")
      .select("id, name, email, inactivity_warning_sent_at, scheduled_deletion_at, purchased_sms_credits, admin_added_sms_credits, sms_credits_used, monthly_sms_used");

    if (shopsErr) throw shopsErr;

    const now = Date.now();
    let warned = 0;
    let deleted = 0;
    let reset = 0;

    for (const shop of shops || []) {
      const { data: lastActivity } = await supabase.rpc("get_shop_last_activity", { _shop_id: shop.id });
      const lastTs = lastActivity ? new Date(lastActivity as string).getTime() : now;
      const inactiveMs = now - lastTs;

      // Reset if activity detected during warning
      if (shop.inactivity_warning_sent_at && inactiveMs < warningCutoffMs) {
        await supabase.from("shops").update({
          inactivity_warning_sent_at: null,
          scheduled_deletion_at: null,
        }).eq("id", shop.id);
        reset++;
        continue;
      }

      // Delete
      if (inactiveMs >= deletionCutoffMs && shop.scheduled_deletion_at && new Date(shop.scheduled_deletion_at).getTime() <= now) {
        // Virtual refund of unused SMS
        const totalCredits = (shop.purchased_sms_credits || 0) + (shop.admin_added_sms_credits || 0);
        const used = (shop.sms_credits_used || 0);
        const remaining = Math.max(0, totalCredits - used);
        if (remaining > 0) {
          await supabase.from("admin_sms_credits_history").insert({
            shop_id: shop.id,
            credits_added: -remaining,
            reason: "inactive_shop_refund",
            notes: `Boutique ${shop.name} supprimée pour inactivité - ${remaining} SMS restitués virtuellement`,
          });
        }

        // Get admin users for this shop to delete auth.users
        const { data: members } = await supabase.from("profiles").select("user_id").eq("shop_id", shop.id);

        // Cascade-like delete of shop data (FKs may handle some)
        const tables = [
          "sav_messages", "sav_parts", "sav_status_history", "sav_audit_logs", "sav_tracking_visits",
          "satisfaction_surveys", "sav_cases",
          "quotes", "order_items", "parts", "part_categories", "suppliers",
          "appointments", "shop_blocked_slots", "shop_working_hours",
          "loaner_loans", "loaner_equipment",
          "inventory_session_items", "inventory_sessions", "inventory_audit_logs",
          "customers", "notifications", "sms_history",
          "custom_widgets", "widget_configurations", "shop_statistics_config", "shop_sav_statuses", "shop_sav_types",
          "shop_seo_config", "shop_services", "shop_billing_config", "shop_role_permissions", "shop_onboarding_progress",
          "messaging_providers", "ai_engine_config", "daily_assistant_config", "invoice_config", "invoice_notifications_config",
          "carousel_items", "landing_content", "sms_invoices", "sms_package_purchases", "subscription_invoices", "subscribers",
          "tracked_products", "alert_history", "import_configurations", "support_messages", "support_tickets",
          "admin_sms_credits_history",
        ];
        for (const t of tables) {
          await supabase.from(t).delete().eq("shop_id", shop.id);
        }
        await supabase.from("profiles").delete().eq("shop_id", shop.id);
        await supabase.from("shops").delete().eq("id", shop.id);

        // Delete auth users
        for (const m of members || []) {
          try {
            await supabase.auth.admin.deleteUser(m.user_id);
          } catch (_) { /* ignore */ }
        }

        deleted++;
        continue;
      }

      // Send warning
      if (inactiveMs >= warningCutoffMs && !shop.inactivity_warning_sent_at) {
        const deletionAt = new Date(lastTs + deletionCutoffMs);
        await supabase.from("shops").update({
          inactivity_warning_sent_at: new Date().toISOString(),
          scheduled_deletion_at: deletionAt.toISOString(),
        }).eq("id", shop.id);

        // Find shop admin (creator/admin profile)
        const { data: admin } = await supabase
          .from("profiles")
          .select("user_id, first_name, phone")
          .eq("shop_id", shop.id)
          .eq("role", "admin")
          .limit(1)
          .maybeSingle();

        let adminEmail: string | null = shop.email;
        if (admin?.user_id) {
          const { data: userData } = await supabase.auth.admin.getUserById(admin.user_id);
          if (userData?.user?.email) adminEmail = userData.user.email;
        }

        const dateStr = deletionAt.toLocaleDateString("fr-FR");
        // Email
        if (adminEmail) {
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#fff;">
              <h2 style="color:#dc2626;margin:0 0 16px;">⚠️ Suppression imminente de votre boutique</h2>
              <p>Bonjour ${admin?.first_name || ""},</p>
              <p>Votre boutique <strong>${shop.name}</strong> n'a enregistré aucune activité (SAV, client, devis, pièce, RDV…) depuis plus de ${thresholdDays - WARNING_DAYS_BEFORE} jours.</p>
              <p>Conformément à notre politique d'inactivité, elle sera <strong>définitivement supprimée le ${dateStr}</strong>.</p>
              <p>Pour annuler la suppression, il vous suffit de vous connecter et de créer ou modifier au moins une donnée.</p>
              <p style="margin-top:24px;color:#666;font-size:12px;">Cet email est envoyé automatiquement par FixWay.</p>
            </div>`;
          try {
            await supabase.functions.invoke("send-app-email", {
              body: {
                to: adminEmail,
                subject: `Votre boutique ${shop.name} sera supprimée le ${dateStr}`,
                html,
                context: "inactivity_warning",
                shopId: shop.id,
              },
            });
          } catch (e) { console.error("email err", e); }
        }

        // SMS
        if (admin?.phone && alert.sms_message_1) {
          const msg = alert.sms_message_1
            .replaceAll("{shop_name}", shop.name)
            .replaceAll("{deletion_date}", dateStr);
          try {
            await supabase.functions.invoke("send-sms", {
              body: { shopId: shop.id, toNumber: admin.phone, message: msg, type: "manual" },
            });
          } catch (e) { console.error("sms err", e); }
        }

        // Notification
        if (admin?.user_id) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            shop_id: shop.id,
            title: "Suppression imminente de votre boutique",
            message: `Votre boutique sera supprimée le ${deletionAt.toLocaleDateString("fr-FR")} faute d'activité. Saisissez des données pour annuler.`,
            type: "warning",
          });
        }

        warned++;
      }
    }

    await supabase.from("system_alerts").update({ last_check_at: new Date().toISOString() }).eq("id", alert.id);

    return new Response(JSON.stringify({ warned, deleted, reset }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("cleanup-inactive-shops error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
