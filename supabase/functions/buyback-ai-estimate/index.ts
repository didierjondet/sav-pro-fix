import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { category, brand, model, answers } = body ?? {};
    if (!category) {
      return new Response(JSON.stringify({ error: 'Catégorie manquante' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Clé IA non configurée' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const details = Object.entries(answers ?? {})
      .filter(([, v]) => v)
      .map(([k, v]) => `- ${k.replace(/_/g, ' ')} : ${v}`)
      .join('\n');

    const prompt = `Tu es expert du rachat de matériel d'occasion cassé ou défectueux en France (marché 2026).
Estime le prix de RACHAT (prix payé au particulier par un professionnel, en euros TTC), pas le prix de revente.
Tiens compte du coût des pièces et de la main d'œuvre pour remettre l'appareil en état, et de la valeur des pièces récupérables.

Catégorie : ${category}
Marque : ${brand || 'non précisée'}
Modèle : ${model || 'non précisé'}
État déclaré :
${details || 'non précisé'}

Réponds uniquement en JSON strict :
{"low": nombre, "mid": nombre, "high": nombre, "rationale": "2 phrases maximum expliquant l'estimation et les points à vérifier"}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.6-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`AI gateway error [${res.status}]: ${text}`);
      return new Response(
        JSON.stringify({ error: res.status === 429 ? 'Trop de requêtes IA, réessayez dans un instant.' : 'Estimation indisponible', details: text }),
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

    const num = (v: unknown) => (typeof v === 'number' ? Math.max(0, Math.round(v)) : null);

    return new Response(
      JSON.stringify({
        low: num(parsed.low) ?? 0,
        mid: num(parsed.mid) ?? 0,
        high: num(parsed.high) ?? 0,
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('buyback-ai-estimate failed', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
