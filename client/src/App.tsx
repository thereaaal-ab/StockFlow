import { useCallback, useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { motion } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsBelowLg } from "@/hooks/useMediaQuery";
import Dashboard from "@/pages/Dashboard";
import HardwareTotal from "@/pages/HardwareTotal";
import Stock from "@/pages/Stock";
import Clients from "@/pages/Clients";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import Gestion from "@/pages/Gestion";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import CrmPipeline from "@/pages/CrmPipeline";
import OrdersPage from "@/pages/Orders";
function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/hardware-total" component={HardwareTotal} />
      <Route path="/stock" component={Stock} />
      <Route path="/clients" component={Clients} />
      <Route path="/crm-pipeline" component={CrmPipeline} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/gestion" component={Gestion} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const isBelowLg = useIsBelowLg();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isMobile && isBelowLg) {
      setSidebarOpen(false);
    }
  }, [isMobile, isBelowLg]);

  const onSidebarOpenChange = useCallback(
    (next: boolean) => {
      if (!isMobile && isBelowLg && next) {
        return;
      }
      setSidebarOpen(next);
    },
    [isMobile, isBelowLg]
  );

  const sidebarStyle = {
    "--sidebar-width": "220px",
    "--sidebar-width-icon": "3.25rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider
      style={sidebarStyle}
      open={sidebarOpen}
      onOpenChange={onSidebarOpenChange}
    >
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
            <ThemeToggle />
          </header>
          <main className="relative flex-1 overflow-auto bg-background p-4 sm:p-6">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-[1600px]"
            >
              <Router />
            </motion.div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="space-y-4 text-center">
              <div className="mx-auto size-12 animate-spin rounded-full border-2 border-muted border-t-mint-500" />
              <p className="ro-overline text-[11px]">Chargement</p>
            </div>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Login />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthenticatedLayout />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
