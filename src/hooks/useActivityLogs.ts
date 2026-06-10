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
  case_number?: string;
  customer_name?: string;
  device_label?: string;
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

      // Pre-fetch SAV info for richer log rows
      const savIds = Array.from(new Set((sav.data || []).map((r: any) => r.sav_case_id).filter(Boolean)));
      const savInfoMap = new Map<string, { case_number?: string; customer_name?: string; device_label?: string }>();
      if (savIds.length) {
        const { data: savRows } = await supabase
          .from('sav_cases')
          .select('id, case_number, device_brand, device_model, customer:customers(first_name, last_name)')
          .in('id', savIds);
        (savRows || []).forEach((s: any) => {
          const c = s.customer;
          const customer_name = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '';
          const device_label = [s.device_brand, s.device_model].filter(Boolean).join(' ');
          savInfoMap.set(s.id, {
            case_number: s.case_number || undefined,
            customer_name: customer_name || undefined,
            device_label: device_label || undefined,
          });
        });
      }

      (sav.data || []).forEach((r: any) => {
        const detailParts: string[] = [];
        if (r.field_name) detailParts.push(r.field_name);
        if (r.old_value || r.new_value) {
          detailParts.push(`${r.old_value ?? '∅'} → ${r.new_value ?? '∅'}`);
        }
        const info = r.sav_case_id ? savInfoMap.get(r.sav_case_id) : undefined;
        entries.push({
          id: `sav-${r.id}`,
          timestamp: r.created_at,
          source: 'sav',
          actor: r.changed_by_name || '—',
          action: r.action || '—',
          target: info?.case_number || (r.sav_case_id ? `SAV ${String(r.sav_case_id).slice(0, 8)}` : (r.table_name || '—')),
          details: detailParts.join(' · '),
          case_number: info?.case_number,
          customer_name: info?.customer_name,
          device_label: info?.device_label,
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
