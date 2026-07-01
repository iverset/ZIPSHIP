import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { LogOut, LayoutDashboard, FolderKanban, PlusCircle, GitBranch } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/repos", label: "Repositories", icon: FolderKanban },
  { href: "/create", label: "New Repository", icon: PlusCircle },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();

  const { data: user } = useGetMe({
    query: { retry: false, staleTime: 30_000, queryKey: getGetMeQueryKey() },
  });

  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => setLocation("/"),
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
          <div className="w-7 h-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-primary" />
          </div>
          <span className="font-mono font-bold text-sm tracking-tight text-foreground">
            Git<span className="text-primary">Push</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 px-2 mb-2 mt-1">
            Navigation
          </p>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/repos"
              ? location.startsWith("/repos")
              : location === href;
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150",
                  active
                    ? "bg-primary/12 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                ].join(" ")}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        {user && (
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2.5 px-2 mb-2">
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-7 h-7 rounded-md border border-border object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-none">{user.login}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Connected</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all duration-150 font-mono"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {logoutMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
