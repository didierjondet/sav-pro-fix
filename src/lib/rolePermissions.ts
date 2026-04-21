export interface RolePermissions {
  menu_dashboard: boolean;
  menu_sav: boolean;
  menu_parts: boolean;
  menu_quotes: boolean;
  menu_orders: boolean;
  menu_customers: boolean;
  menu_chats: boolean;
  menu_agenda: boolean;
  menu_reports: boolean;
  menu_statistics: boolean;
  menu_settings: boolean;
  settings_subscription: boolean;
  settings_sms_purchase: boolean;
  settings_users: boolean;
  settings_import_export: boolean;
  settings_inventory: boolean;
  settings_part_categories: boolean;
  sav_logs: boolean;
  can_delete_sav: boolean;
  can_create_quotes: boolean;
  can_manage_stock: boolean;
  inventory_apply_stock: boolean;
  simplified_view_default: boolean;
}

export type RolePermissionKey = keyof RolePermissions;

export const ROLE_PERMISSION_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  technician: 'Technicien',
  shop_admin: 'Responsable magasin',
};

export const ROLE_PERMISSION_DEFAULTS: Record<string, RolePermissions> = {
  admin: {
    menu_dashboard: true,
    menu_sav: true,
    menu_parts: true,
    menu_quotes: true,
    menu_orders: true,
    menu_customers: true,
    menu_chats: true,
    menu_agenda: true,
    menu_reports: true,
    menu_statistics: true,
    menu_settings: true,
    settings_subscription: true,
    settings_sms_purchase: true,
    settings_users: true,
    settings_import_export: true,
    settings_inventory: true,
    sav_logs: true,
    can_delete_sav: true,
    can_create_quotes: true,
    can_manage_stock: true,
    inventory_apply_stock: true,
    simplified_view_default: false,
  },
  technician: {
    menu_dashboard: true,
    menu_sav: true,
    menu_parts: true,
    menu_quotes: true,
    menu_orders: true,
    menu_customers: true,
    menu_chats: true,
    menu_agenda: true,
    menu_reports: false,
    menu_statistics: false,
    menu_settings: true,
    settings_subscription: false,
    settings_sms_purchase: false,
    settings_users: false,
    settings_import_export: false,
    settings_inventory: false,
    sav_logs: false,
    can_delete_sav: false,
    can_create_quotes: true,
    can_manage_stock: true,
    inventory_apply_stock: false,
    simplified_view_default: false,
  },
  shop_admin: {
    menu_dashboard: true,
    menu_sav: true,
    menu_parts: true,
    menu_quotes: true,
    menu_orders: false,
    menu_customers: true,
    menu_chats: true,
    menu_agenda: true,
    menu_reports: false,
    menu_statistics: false,
    menu_settings: false,
    settings_subscription: false,
    settings_sms_purchase: false,
    settings_users: false,
    settings_import_export: false,
    settings_inventory: false,
    sav_logs: false,
    can_delete_sav: false,
    can_create_quotes: true,
    can_manage_stock: true,
    inventory_apply_stock: false,
    simplified_view_default: true,
  },
};

export const ROLE_PERMISSION_GROUPS: Array<{
  label: string;
  items: Array<{ key: RolePermissionKey; label: string }>;
}> = [
  {
    label: 'Menus',
    items: [
      { key: 'menu_dashboard', label: 'Tableau de bord' },
      { key: 'menu_sav', label: 'Dossiers SAV' },
      { key: 'menu_parts', label: 'Stock pièces' },
      { key: 'menu_quotes', label: 'Devis' },
      { key: 'menu_orders', label: 'Commandes' },
      { key: 'menu_customers', label: 'Clients' },
      { key: 'menu_chats', label: 'Chat clients' },
      { key: 'menu_agenda', label: 'Agenda' },
      { key: 'menu_reports', label: 'Rapports' },
      { key: 'menu_statistics', label: 'Statistiques' },
      { key: 'menu_settings', label: 'Menu Réglages' },
    ],
  },
  {
    label: 'Réglages accessibles',
    items: [
      { key: 'settings_subscription', label: 'Abonnement / Plans' },
      { key: 'settings_sms_purchase', label: 'Achat de SMS' },
      { key: 'settings_users', label: 'Gestion des utilisateurs' },
      { key: 'settings_import_export', label: 'Import / Export' },
      { key: 'settings_inventory', label: 'Inventaire' },
    ],
  },
  {
    label: 'Fonctionnalités',
    items: [
      { key: 'sav_logs', label: 'Voir les logs SAV' },
      { key: 'can_delete_sav', label: 'Supprimer des SAV' },
      { key: 'can_create_quotes', label: 'Créer des devis' },
      { key: 'can_manage_stock', label: 'Gérer le stock' },
      { key: 'inventory_apply_stock', label: 'Valider un inventaire et appliquer les stocks' },
      { key: 'simplified_view_default', label: 'Vue simplifiée par défaut' },
    ],
  },
];

export function getRolePermissionDefaults(role: string): RolePermissions {
  return ROLE_PERMISSION_DEFAULTS[role] || ROLE_PERMISSION_DEFAULTS.technician;
}
