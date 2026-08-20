import {
  Home,
  Package,
  Warehouse,
  Users,
  BriefcaseBusiness,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Hardware Total",
    url: "/hardware-total",
    icon: Package,
  },
  {
    title: "Stock Actuel",
    url: "/stock",
    icon: Warehouse,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
  },
  {
    title: "CRM Pipeline",
    url: "/crm-pipeline",
    icon: BriefcaseBusiness,
  },
  {
    title: "Commandes",
    url: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      });
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion.",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0].substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Utilisateur";
  };

  const getUserEmail = () => {
    return user?.email || "Aucun email";
  };

  const getUserAvatar = () => {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || undefined;
  };

  return (
    <Sidebar collapsible="icon" className="border-0 bg-ink-850">
      <SidebarHeader className="border-0 px-3 pb-2 pt-4">
        <div className="flex items-center gap-2.5 px-1">
          {/* Dans les interfaces denses, le mark se réduit à une tuile de 30-40px. */}
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-500 font-mono text-sm font-extrabold text-ink-850"
            style={{ fontFeatureSettings: "'zero' 1" }}
            aria-hidden
          >
            R0
          </div>
          <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-extrabold tracking-heading text-[#F6F8F7]">
              Inventaire Pro
            </span>
            <span className="ro-overline truncate text-[10px] text-ink-400">
              Gestion matériel
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 border-0 px-2">
        <SidebarGroup className="py-0">
          <SidebarGroupLabel className="ro-overline mb-1.5 px-3 text-[10px] text-ink-500">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "text-ink-200 [&>svg]:text-ink-400 transition-colors duration-fast ease-ro",
                        "hover:bg-ink-800 hover:text-[#F6F8F7]",
                        // L'état actif est jaune : c'est le seul accent de marque du rail.
                        "data-[active=true]:bg-ink-800 data-[active=true]:font-bold",
                        "data-[active=true]:text-brand-500 data-[active=true]:[&>svg]:text-brand-500"
                      )}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/settings"}
                  tooltip="Paramètres"
                  className={cn(
                    "text-ink-200 [&>svg]:text-ink-400 transition-colors duration-fast ease-ro",
                    "hover:bg-ink-800 hover:text-[#F6F8F7]",
                    "data-[active=true]:bg-ink-800 data-[active=true]:font-bold",
                    "data-[active=true]:text-brand-500 data-[active=true]:[&>svg]:text-brand-500"
                  )}
                  data-testid="link-settings"
                >
                  <Link href="/settings">
                    <Settings className="size-4 shrink-0" />
                    <span>Paramètres</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg bg-ink-800 p-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:p-1">
          <Avatar className="size-9 shrink-0 ring-2 ring-mint-500">
            <AvatarImage src={getUserAvatar()} alt={getUserName()} />
            <AvatarFallback className="bg-ink-700 text-sm font-bold text-[#F6F8F7]">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold text-[#F6F8F7]">
              {getUserName()}
            </p>
            <p className="ro-data truncate text-[11px] text-ink-400">
              {getUserEmail()}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-2 rounded-lg text-ink-300 hover:bg-ink-800 hover:text-[#F6F8F7] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="size-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:sr-only">Déconnexion</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
