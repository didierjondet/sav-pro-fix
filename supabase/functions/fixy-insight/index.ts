// Fixy AI Insight: génère une question/éclairage technique court à partir des
// notes techniques d'un SAV qui traîne. Appelé ponctuellement par Fixy.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Payload {
  case_number?: string;
  device?: string;
  problem_description?: string;
  technician_comments?: string;
  days_late?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Payload;
    const { case_number, device, problem_description, technician_comments, days_late } = body || {};

    if (!problem_description && !technician_comments) {
      return new Response(JSON.stringify({ suggestion: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userPrompt = [
      `SAV ${case_number ?? '?'} en retard de ${Math.max(1, Math.round(days_late ?? 1))} jour(s).`,
      device ? `Appareil : ${device}` : '',
      problem_description ? `Panne déclarée : ${problem_description}` : '',
      technician_comments ? `Notes technicien : ${technician_comments}` : '',
      '',
      "Propose en UNE phrase très courte (max 140 caractères) une question ou piste technique différente",
      "qui pourrait débloquer ce SAV. Ton direct, tutoiement, pas d'emoji, pas de salutation.",
    ].filter(Boolean).join('\n');

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: "Tu es Fixy, assistant d'un atelier de réparation. Tu donnes des pistes techniques concises au technicien." },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: 'payment_required' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('AI gateway error', aiResp.status, t);
      return new Response(JSON.stringify({ error: 'ai_error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiResp.json();
    let suggestion: string = data?.choices?.[0]?.message?.content?.trim?.() ?? '';
    suggestion = suggestion.replace(/^["'«»]+|["'«»]+$/g, '').slice(0, 160);

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('fixy-insight error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
