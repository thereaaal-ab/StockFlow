import {
  Home,
  Package,
  Warehouse,
  Users,
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
    <Sidebar collapsible="icon" className="border-0">
      <SidebarHeader className="border-0 px-3 pb-2 pt-4">
        <div className="flex items-center gap-2.5 px-1">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/25"
            aria-hidden
          >
            IP
          </div>
          <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              Inventaire Pro
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              Gestion matériel
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 border-0 px-2">
        <SidebarGroup className="py-0">
          <SidebarGroupLabel className="mb-1 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
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
                        isActive && "text-primary [&>svg]:text-primary"
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
                    location === "/settings" && "text-primary [&>svg]:text-primary"
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
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/40 p-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:p-1">
          <div
            className="rounded-full p-[2px]"
            style={{
              background:
                "linear-gradient(135deg, hsl(239 84% 67%), hsl(188 94% 43%))",
            }}
          >
            <Avatar className="size-9 border-2 border-sidebar bg-sidebar">
              <AvatarImage src={getUserAvatar()} alt={getUserName()} />
              <AvatarFallback className="bg-sidebar text-sm font-semibold text-sidebar-foreground">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium text-[color:var(--enterprise-text-primary,hsl(var(--sidebar-foreground)))]">
              {getUserName()}
            </p>
            <p className="truncate text-xs text-[color:var(--enterprise-text-muted,hsl(var(--muted-foreground)))]">
              {getUserEmail()}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-2 text-muted-foreground transition-colors duration-150 hover:text-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
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
