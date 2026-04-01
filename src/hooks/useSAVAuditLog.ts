import { supabase } from '@/integrations/supabase/client';

const FIELD_LABELS: Record<string, string> = {
  device_brand: 'Marque appareil',
  device_model: 'Modèle appareil',
  device_imei: 'IMEI',
  device_color: 'Couleur',
  device_grade: 'Grade',
  sku: 'SKU',
  problem_description: 'Description du problème',
  repair_notes: 'Notes de réparation',
  technician_comments: 'Commentaires technicien',
  private_comments: 'Commentaires privés',
  status: 'Statut',
  sav_type: 'Type SAV',
  total_cost: 'Coût total',
  total_time_minutes: 'Temps total',
  customer_id: 'Client',
  taken_over: 'Prise en charge',
  takeover_amount: 'Montant prise en charge',
  deposit_amount: 'Acompte',
};

export function getFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] || fieldName;
}

export async function logSAVChange(
  savCaseId: string,
  shopId: string,
  tableName: string,
  action: string,
  fieldName: string | null,
  oldValue: string | null,
  newValue: string | null,
  userName: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('sav_audit_logs' as any).insert({
      sav_case_id: savCaseId,
      shop_id: shopId,
      table_name: tableName,
      action,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
      changed_by_user_id: user?.id || null,
      changed_by_name: userName,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

export async function logSAVChanges(
  savCaseId: string,
  shopId: string,
  tableName: string,
  changes: { field: string; oldValue: string | null; newValue: string | null }[],
  userName: string
) {
  if (changes.length === 0) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const logs = changes.map(c => ({
      sav_case_id: savCaseId,
      shop_id: shopId,
      table_name: tableName,
      action: 'update',
      field_name: c.field,
      old_value: c.oldValue,
      new_value: c.newValue,
      changed_by_user_id: user?.id || null,
      changed_by_name: userName,
    }));

    await supabase.from('sav_audit_logs' as any).insert(logs);
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

export async function getCurrentUserName(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'Inconnu';
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();
    
    if (profile) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Inconnu';
    }
    return 'Inconnu';
  } catch {
    return 'Inconnu';
  }
}
