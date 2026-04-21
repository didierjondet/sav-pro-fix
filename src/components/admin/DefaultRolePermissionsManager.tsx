import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Shield, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_PERMISSION_GROUPS, ROLE_PERMISSION_LABELS, getRolePermissionDefaults, type RolePermissions } from '@/lib/rolePermissions';

const ALL_TRUE: RolePermissions = getRolePermissionDefaults('admin');

export function DefaultRolePermissionsManager() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState('technician');
  const [permissions, setPermissions] = useState<RolePermissions>(ALL_TRUE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDefaults(selectedRole);
  }, [selectedRole]);

  const loadDefaults = async (role: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('default_role_permissions' as any)
        .select('permissions')
        .eq('role', role)
        .maybeSingle() as any;

      if (data?.permissions) {
        setPermissions({ ...ALL_TRUE, ...data.permissions });
      } else {
        setPermissions(ALL_TRUE);
      }
    } catch (e) {
      console.error('Error loading default permissions:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('default_role_permissions' as any)
        .upsert({
          role: selectedRole,
          permissions,
        }, { onConflict: 'role' });

      if (error) throw error;
      toast({ title: 'Succès', description: `Permissions par défaut du rôle "${ROLE_PERMISSION_LABELS[selectedRole]}" sauvegardées` });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (key: string) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key as keyof RolePermissions] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Permissions par défaut des rôles
        </h2>
        <p className="text-muted-foreground mt-1">
          Ces permissions seront appliquées automatiquement à chaque nouvelle boutique créée.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Label>Rôle à configurer :</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="technician">Technicien</SelectItem>
                <SelectItem value="shop_admin">Responsable magasin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {ROLE_PERMISSION_GROUPS.map((group, gi) => (
                <div key={gi}>
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    {group.label}
                  </h4>
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label className="cursor-pointer">{item.label}</Label>
                        <Switch
                          checked={permissions[item.key as keyof RolePermissions] as boolean}
                          onCheckedChange={() => togglePermission(item.key)}
                        />
                      </div>
                    ))}
                  </div>
                  {gi < ROLE_PERMISSION_GROUPS.length - 1 && <Separator className="my-4" />}
                </div>
              ))}

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Sauvegarder les permissions par défaut
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
