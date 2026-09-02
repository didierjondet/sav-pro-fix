import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { category, brand, model, answers } = (await req.json()) ?? {};
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

    const prompt = `Tu aides un particulier français à décrire précisément un appareil qu'il veut faire racheter par un réparateur.
Objectif : obtenir un état du produit assez précis pour qu'un professionnel puisse chiffrer sans se déplacer.

Catégorie : ${category}
Marque : ${brand || 'non précisée'}
Modèle : ${model || 'non précisé'}
Déjà renseigné :
${details || 'rien'}

Donne, adapté PRÉCISÉMENT à ce produit :
1. "questions" : 3 à 6 questions complémentaires réellement discriminantes pour ce modèle (ne répète pas ce qui est déjà renseigné). Type "select" avec 2 à 5 options courtes, ou "text" si une valeur libre est indispensable.
2. "issues" : 4 à 8 pannes ou points problématiques typiques de ce produit, formulés en 2 à 4 mots.
3. "photos" : 3 à 5 photos à prendre, avec un angle et une consigne concrète (distance, éclairage, ce qui doit être visible).

Réponds uniquement en JSON strict :
{"questions":[{"id":"snake_case","label":"...","type":"select|text","options":["..."]}],"issues":["..."],"photos":[{"id":"snake_case","label":"...","hint":"..."}]}`;

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
        JSON.stringify({
          error: res.status === 429 ? 'Trop de requêtes IA, réessayez dans un instant.' : 'Guidage indisponible',
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

    const questions = Array.isArray(parsed.questions)
      ? parsed.questions
          .filter((q: any) => q?.id && q?.label)
          .slice(0, 6)
          .map((q: any) => ({
            id: `ia_${String(q.id).replace(/[^\w]/g, '_')}`,
            label: String(q.label),
            type: q.type === 'text' ? 'text' : 'select',
            options: Array.isArray(q.options) ? q.options.map(String).slice(0, 6) : [],
          }))
          .filter((q: any) => q.type === 'text' || q.options.length > 1)
      : [];

    const issues = Array.isArray(parsed.issues) ? parsed.issues.map(String).slice(0, 8) : [];

    const photos = Array.isArray(parsed.photos)
      ? parsed.photos
          .filter((p: any) => p?.label)
          .slice(0, 5)
          .map((p: any, i: number) => ({
            id: `ia_${String(p.id ?? i).replace(/[^\w]/g, '_')}`,
            label: String(p.label),
            hint: String(p.hint ?? ''),
          }))
      : [];

    return new Response(JSON.stringify({ questions, issues, photos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('buyback-ai-guide failed', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
