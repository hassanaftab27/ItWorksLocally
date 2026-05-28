import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { ListChecks, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function Layout() {
  const isMobile = useIsMobile();
  const { mode, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true
  );

  // Collapse the sidebar whenever the viewport drops into mobile range.
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const closeOnMobile = () => {
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "shrink-0 overflow-hidden transition-[width,transform] duration-200 ease-in-out",
          "fixed inset-y-0 left-0 z-40 w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "md:static md:translate-x-0",
          sidebarOpen ? "md:w-64" : "md:w-0"
        )}
      >
        <Sidebar onNavigate={closeOnMobile} />
      </div>

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-2 sm:px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen((o) => !o)}
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
              <span className="hidden sm:inline">
                {sidebarOpen ? "Hide" : "Show"}
              </span>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              title="My Tasks"
              aria-label="My Tasks"
            >
              <Link to="/">
                <ListChecks className="size-4" />
                <span className="hidden sm:inline">My Tasks</span>
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggle}
              title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {mode === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
              <span className="hidden sm:inline">
                {mode === "dark" ? "Light" : "Dark"}
              </span>
            </Button>
            <UserMenu />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
