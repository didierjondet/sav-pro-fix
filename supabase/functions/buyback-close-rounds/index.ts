import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: expired, error } = await supabase
      .from('buyback_requests')
      .select('id')
      .eq('network_open', true)
      .eq('status', 'network')
      .lt('network_deadline', new Date().toISOString());

    if (error) throw error;

    let closed = 0;
    for (const row of expired ?? []) {
      const { error: rpcError } = await supabase.rpc('close_buyback_round', { p_request_id: row.id });
      if (rpcError) {
        console.error(`close_buyback_round failed for ${row.id}: ${rpcError.message}`);
        continue;
      }
      closed++;
    }

    return new Response(JSON.stringify({ closed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('buyback-close-rounds failed', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
