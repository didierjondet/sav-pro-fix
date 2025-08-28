import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  Store,
  Users,
  MessageSquare,
  Settings,
  Globe,
  Palette,
  FileText,
  Zap,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

interface SuperAdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  {
    group: "Vue d'ensemble",
    items: [
      { id: "dashboard", title: "Tableau de bord", icon: BarChart3 },
    ]
  },
  {
    group: "Gestion",
    items: [
      { id: "shops", title: "Magasins", icon: Store },
      { id: "users", title: "Utilisateurs", icon: Users },
    ]
  },
  {
    group: "Fonctionnalités",
    items: [
      { id: "plans", title: "Plans d'abonnement", icon: Settings },
      { id: "sms", title: "Crédits SMS", icon: MessageSquare },
      { id: "support", title: "Support", icon: HelpCircle },
    ]
  },
  {
    group: "Configuration",
    items: [
      { id: "seo", title: "SEO", icon: Globe },
      { id: "branding", title: "Charte graphique", icon: Palette },
      { id: "landing", title: "Landing Page", icon: FileText },
      { id: "sms-packages", title: "Packs SMS", icon: Zap },
    ]
  },
  {
    group: "Analyse",
    items: [
      { id: "statistics", title: "Statistiques", icon: TrendingUp },
    ]
  }
];

export function SuperAdminSidebar({ activeSection, onSectionChange }: SuperAdminSidebarProps) {
  const { collapsed } = useSidebar();

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible>
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        {menuItems.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex}>
            <SidebarGroupLabel>{!collapsed && group.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      onClick={() => onSectionChange(item.id)}
                      className={`cursor-pointer ${
                        activeSection === item.id 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}