import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';

export type ActivityLogSource = 'sav' | 'inventory' | 'email';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  source: ActivityLogSource;
  actor: string;
  action: string;
  target: string;
  details: string;
}

interface Params {
  from: Date;
  to: Date;
}

export function useActivityLogs({ from, to }: Params) {
  const { shop } = useShop();
  const shopId = shop?.id;

  return useQuery({
    queryKey: ['activity-logs', shopId, from.toISOString(), to.toISOString()],
    enabled: !!shopId,
    queryFn: async (): Promise<ActivityLogEntry[]> => {
      const fromIso = from.toISOString();
      const toIso = to.toISOString();

      const [sav, inv, email] = await Promise.all([
        supabase
          .from('sav_audit_logs')
          .select('id, created_at, action, table_name, field_name, old_value, new_value, changed_by_name, sav_case_id')
          .eq('shop_id', shopId!)
          .gte('created_at', fromIso)
          .lt('created_at', toIso)
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase
          .from('inventory_audit_logs')
          .select('id, created_at, action, field_name, old_value, new_value, changed_by_name, inventory_session_id')
          .eq('shop_id', shopId!)
          .gte('created_at', fromIso)
          .lt('created_at', toIso)
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase
          .from('email_send_logs')
          .select('id, created_at, provider, to_email, subject, status, error_message, context')
          .eq('shop_id', shopId!)
          .gte('created_at', fromIso)
          .lt('created_at', toIso)
          .order('created_at', { ascending: false })
          .limit(2000),
      ]);

      const entries: ActivityLogEntry[] = [];

      (sav.data || []).forEach((r: any) => {
        const detailParts: string[] = [];
        if (r.field_name) detailParts.push(r.field_name);
        if (r.old_value || r.new_value) {
          detailParts.push(`${r.old_value ?? '∅'} → ${r.new_value ?? '∅'}`);
        }
        entries.push({
          id: `sav-${r.id}`,
          timestamp: r.created_at,
          source: 'sav',
          actor: r.changed_by_name || '—',
          action: r.action || '—',
          target: r.sav_case_id ? `SAV ${String(r.sav_case_id).slice(0, 8)}` : (r.table_name || '—'),
          details: detailParts.join(' · '),
        });
      });

      (inv.data || []).forEach((r: any) => {
        const detailParts: string[] = [];
        if (r.field_name) detailParts.push(r.field_name);
        if (r.old_value || r.new_value) {
          detailParts.push(`${r.old_value ?? '∅'} → ${r.new_value ?? '∅'}`);
        }
        entries.push({
          id: `inv-${r.id}`,
          timestamp: r.created_at,
          source: 'inventory',
          actor: r.changed_by_name || '—',
          action: r.action || '—',
          target: r.inventory_session_id ? `Inventaire ${String(r.inventory_session_id).slice(0, 8)}` : '—',
          details: detailParts.join(' · '),
        });
      });

      (email.data || []).forEach((r: any) => {
        entries.push({
          id: `email-${r.id}`,
          timestamp: r.created_at,
          source: 'email',
          actor: r.provider || '—',
          action: r.status || 'sent',
          target: r.to_email || '—',
          details: [r.subject, r.context, r.error_message].filter(Boolean).join(' · '),
        });
      });

      entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
      return entries;
    },
  });
}
