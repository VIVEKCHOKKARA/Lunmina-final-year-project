import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OwnerSelector } from "@/components/OwnerSelector";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 shrink-0 gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="font-display text-sm font-medium text-muted-foreground hidden sm:block">
                AI-Driven Analytics
              </h1>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <OwnerSelector />
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
