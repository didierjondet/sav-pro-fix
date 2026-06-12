import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Candidate {
  id: string;
  name: string;
  reference?: string | null;
}

interface Body {
  query: string;
  candidates: Candidate[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    const query = (body.query ?? '').toString().trim();
    const candidates = Array.isArray(body.candidates) ? body.candidates.slice(0, 30) : [];

    if (!query || candidates.length === 0) {
      return new Response(JSON.stringify({ error: 'query et candidates requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const list = candidates
      .map((c, i) => `${i + 1}. [${c.id}] ${c.name}${c.reference ? ` (ref: ${c.reference})` : ''}`)
      .join('\n');

    const prompt = `Tu es un assistant qui aide à classer une liste de pièces détachées par pertinence selon une recherche.

Recherche utilisateur: "${query}"

Liste de pièces candidates:
${list}

Retourne UNIQUEMENT un objet JSON de la forme { "ids": ["id1", "id2", ...] } contenant les identifiants triés du plus pertinent au moins pertinent. Exclus les pièces clairement hors-sujet. Si un modèle précis (ex: "iphone 12") est mentionné, place EN PREMIER les pièces qui correspondent exactement à ce modèle, puis les variantes compatibles, puis les autres. Ne renvoie aucun autre texte.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'Tu réponds uniquement en JSON valide.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI gateway ${aiRes.status}: ${errText}` }), {
        status: aiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? '{}';
    let parsed: { ids?: string[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { ids: [] };
    }

    const validIds = new Set(candidates.map((c) => c.id));
    const ids = (parsed.ids ?? []).filter((id) => validIds.has(id));

    return new Response(JSON.stringify({ ids }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
