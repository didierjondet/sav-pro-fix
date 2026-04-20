import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// === AES-GCM Decryption Helper ===
async function getDecryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("AI_ENCRYPTION_KEY") || "default-fallback-key-change-me";
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode("ai-config-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

async function decryptApiKey(encrypted: string): Promise<string> {
  const key = await getDecryptionKey();
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

interface AIConfig {
  url: string;
  apiKey: string;
  model: string;
  provider: string;
  keySource: string;
}

interface AIConfigError {
  error: string;
}

async function getAIConfig(supabaseClient: any): Promise<AIConfig | AIConfigError> {
  const { data, error: dbError } = await supabaseClient
    .from("ai_engine_config")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (dbError) {
    console.error("[AI-REFORMULATE] Erreur lecture ai_engine_config:", dbError.message);
    return { error: `Erreur de lecture de la configuration IA: ${dbError.message}` };
  }

  // Cas 1: Aucune config active → fallback Lovable
  if (!data) {
    console.log("[AI-REFORMULATE] Aucune config active, fallback Lovable");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return { error: "Aucune configuration IA active et clé Lovable absente." };
    }
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: lovableKey,
      model: "google/gemini-2.5-flash",
      provider: "lovable (fallback)",
      keySource: "env:LOVABLE_API_KEY",
    };
  }

  // Cas 2: Config "lovable" active
  if (data.provider === "lovable") {
    console.log("[AI-REFORMULATE] Config active: lovable, modèle:", data.model);
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return { error: "Provider Lovable configuré mais clé LOVABLE_API_KEY absente." };
    }
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: lovableKey,
      model: data.model || "google/gemini-2.5-flash",
      provider: "lovable",
      keySource: "env:LOVABLE_API_KEY",
    };
  }

  // Cas 3: Config tierce (gemini, openai) → STRICT, pas de fallback
  console.log(`[AI-REFORMULATE] Config active: provider=${data.provider}, modèle=${data.model}`);

  let apiKey: string | undefined;
  let keySource = "unknown";

  // Essayer la clé chiffrée en DB
  if (data.encrypted_api_key) {
    try {
      apiKey = await decryptApiKey(data.encrypted_api_key);
      keySource = "db:encrypted_api_key";
      console.log("[AI-REFORMULATE] Clé API déchiffrée depuis la DB");
    } catch (e) {
      console.error("[AI-REFORMULATE] Échec déchiffrement clé API:", (e as Error).message);
      // NE PAS fallback → essayer env comme dernier recours
    }
  }

  // Si pas de clé chiffrée ou échec déchiffrement, essayer la variable d'env
  if (!apiKey && data.api_key_name) {
    apiKey = Deno.env.get(data.api_key_name);
    if (apiKey) {
      keySource = `env:${data.api_key_name}`;
      console.log(`[AI-REFORMULATE] Clé API lue depuis env: ${data.api_key_name}`);
    }
  }

  // STRICT: si pas de clé, erreur explicite (pas de fallback Lovable)
  if (!apiKey) {
    const msg = data.encrypted_api_key
      ? `Clé API ${data.provider} impossible à déchiffrer et variable d'environnement ${data.api_key_name || "non configurée"} absente. Reconfigurez la clé dans Super Admin > Moteur IA.`
      : `Clé API ${data.provider} non configurée. Allez dans Super Admin > Moteur IA pour saisir votre clé API.`;
    return { error: msg };
  }

  // Déterminer l'URL selon le provider
  let url: string;
  switch (data.provider) {
    case "openai":
      url = "https://api.openai.com/v1/chat/completions";
      break;
    case "gemini":
      url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      break;
    default:
      return { error: `Provider IA inconnu: "${data.provider}". Providers supportés: lovable, openai, gemini.` };
  }

  console.log(`[AI-REFORMULATE] URL cible: ${url}, keySource: ${keySource}`);

  return {
    url,
    apiKey,
    model: data.model,
    provider: data.provider,
    keySource,
  };
}

function getSystemPrompt(context: string): string {
  switch (context) {
    case "problem_description":
      return `Tu es un assistant expert en réparation qui aide à reformuler les descriptions de problèmes techniques.
CONTEXTE IMPORTANT :
- L'agent en réception (qui crée le SAV avec le client) rédige ces notes
- Ces notes sont destinées aux TECHNICIENS de l'équipe qui vont prendre en charge la réparation
- Le client peut voir ces commentaires mais ils ne lui sont PAS destinés directement
- L'objectif est que le technicien comprenne rapidement la panne et les actions à mener

Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Structurer le texte pour une lecture rapide par un technicien
- Mettre en avant les symptômes, le contexte de la panne et les attentes du client
- Utiliser un vocabulaire technique clair mais accessible
- Garder les informations essentielles sans inventer de détails
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
    case "repair_notes":
      return `Tu es un technicien expert qui aide à reformuler les notes de réparation.
CONTEXTE IMPORTANT :
- Ces notes documentent les interventions effectuées par le technicien
- Elles sont destinées à l'équipe technique et au suivi du dossier
- Le client peut les consulter mais elles servent avant tout de trace technique

Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Organiser les informations de manière logique (diagnostic, intervention, résultat)
- Utiliser un vocabulaire technique approprié mais compréhensible
- Détailler clairement les interventions effectuées
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
    case "technician_comments":
      return `Tu es un assistant expert qui aide à reformuler les commentaires dans un SAV.
CONTEXTE IMPORTANT :
- L'AGENT qui reçoit le client rédige ces commentaires
- Ces commentaires sont destinés aux TECHNICIENS de l'équipe
- L'objectif est de transmettre clairement la demande du client et le contexte de la panne
- Le client peut voir ces commentaires mais ils ne lui sont pas adressés directement

Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Structurer l'information pour une compréhension rapide par le technicien
- Mettre en avant : ce que le client a décrit, les symptômes observés, les actions attendues
- Garder un ton professionnel et factuel
- Éviter le jargon incompréhensible mais rester technique si nécessaire
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
    case "private_comments":
      return `Tu es un assistant qui aide à reformuler les notes internes pour qu'elles soient claires et organisées.
Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Structurer les informations de manière logique
- Garder un style direct et factuel
- Conserver tous les détails techniques importants
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
    case "chat_message":
      return `Tu es un assistant qui aide à reformuler les messages de chat pour qu'ils soient clairs, polis et professionnels.
Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Rendre le message plus fluide et naturel
- Garder un ton professionnel mais amical
- Conserver le sens original du message
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
    case "sms_message":
      return `Tu es un assistant qui aide à reformuler les SMS professionnels pour qu'ils soient clairs et efficaces.
Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Garder un ton professionnel mais chaleureux
- IMPÉRATIF : Respecter une limite stricte de 160 caractères maximum
- Conserver les émojis appropriés s'ils sont présents
- Ne pas ajouter de formules de politesse excessives
- Garder le message concis et direct
- Si le texte dépasse 160 caractères, le raccourcir intelligemment sans perdre le sens
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
    default:
      return `Tu es un assistant qui aide à reformuler et corriger du texte.
Corrige l'orthographe, la grammaire et améliore la clarté.
Réponds UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction.`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, context } = await req.json();

    if (!text || text.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Le texte ne peut pas être vide" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const aiConfig = await getAIConfig(supabaseClient);

    if ("error" in aiConfig) {
      console.error("[AI-REFORMULATE] Config error:", aiConfig.error);
      return new Response(
        JSON.stringify({ error: aiConfig.error }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AI-REFORMULATE] Appel IA: provider=${aiConfig.provider}, model=${aiConfig.model}, url=${aiConfig.url}`);

    const systemPrompt = getSystemPrompt(context);

    const requestBody = JSON.stringify({
      model: aiConfig.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
    });

    const fetchAI = async () => {
      return await fetch(aiConfig.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
      });
    };

    let response = await fetchAI();

    // Retry once after 2s on 429 or 503
    if (response.status === 429 || response.status === 503) {
      console.log(`[AI-REFORMULATE] ${aiConfig.provider} returned ${response.status}, retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
      response = await fetchAI();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-REFORMULATE] Erreur ${aiConfig.provider} (${response.status}):`, errorText);

      const providerLabel = aiConfig.provider.charAt(0).toUpperCase() + aiConfig.provider.slice(1);

      // Toujours retourner HTTP 200 pour que le client puisse lire le message d'erreur explicite
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: `Clé API ${providerLabel} invalide ou expirée. Reconfigurez-la dans Super Admin > Moteur IA.` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: `Limite de requêtes ${providerLabel} atteinte (quota gratuit Google : 20/jour/modèle). Attendez quelques minutes ou passez à Lovable AI dans Super Admin > Moteur IA.` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 503) {
        return new Response(
          JSON.stringify({ error: `Service ${providerLabel} temporairement indisponible. Réessayez dans quelques instants.` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: `Crédits ${providerLabel} insuffisants. Rechargez votre compte ou changez de provider dans Super Admin > Moteur IA.` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 400) {
        return new Response(
          JSON.stringify({ error: `Requête rejetée par ${providerLabel}: modèle "${aiConfig.model}" invalide ou paramètres incorrects. Vérifiez la config dans Super Admin > Moteur IA.` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Erreur ${providerLabel} (${response.status}): ${errorText.substring(0, 200)}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reformulatedText = data.choices?.[0]?.message?.content;

    if (!reformulatedText) {
      console.error("[AI-REFORMULATE] Réponse IA sans contenu:", JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ error: `Le provider ${aiConfig.provider} n'a retourné aucun texte. Vérifiez le modèle configuré.` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AI-REFORMULATE] Succès via ${aiConfig.provider}/${aiConfig.model}`);

    return new Response(
      JSON.stringify({ reformulatedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[AI-REFORMULATE] Erreur inattendue:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue dans la fonction de reformulation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
