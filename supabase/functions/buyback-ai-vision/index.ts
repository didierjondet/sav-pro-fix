import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { category, brand, model, working_state, paths } = (await req.json()) ?? {};

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Clé IA non configurée' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const urls: string[] = [];
    for (const p of (Array.isArray(paths) ? paths : []).slice(0, 4)) {
      const { data } = await supabase.storage.from('buyback-media').createSignedUrl(String(p), 600);
      if (data?.signedUrl) urls.push(data.signedUrl);
    }

    if (urls.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune photo exploitable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Tu es expert en reprise de matériel d'occasion en France.
Analyse les photos d'un ${category}${brand ? ' ' + brand : ''}${model ? ' ' + model : ''}.
Le vendeur déclare : ${working_state || 'non précisé'}.

Décris l'état réellement visible sur les photos, sans inventer ce que tu ne vois pas.
Réponds uniquement en JSON strict :
{"etat_general":"une phrase claire pour le vendeur","ecran":"...","chassis":"...","usure":"...","points_constates":["..."],"doutes":["..."]}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...urls.map((url) => ({ type: 'image_url', image_url: { url } })),
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`AI gateway error [${res.status}]: ${text}`);
      return new Response(
        JSON.stringify({
          error: res.status === 429 ? 'Trop de requêtes IA, réessayez dans un instant.' : 'Analyse indisponible',
        }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    const result = {
      etat_general: String(parsed.etat_general ?? ''),
      ecran: String(parsed.ecran ?? ''),
      chassis: String(parsed.chassis ?? ''),
      usure: String(parsed.usure ?? ''),
      points_constates: Array.isArray(parsed.points_constates) ? parsed.points_constates.map(String).slice(0, 8) : [],
      doutes: Array.isArray(parsed.doutes) ? parsed.doutes.map(String).slice(0, 5) : [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('buyback-ai-vision failed', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
