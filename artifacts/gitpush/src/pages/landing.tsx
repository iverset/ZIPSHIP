import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { GitBranch, ArrowRight, Zap, Lock, GitCommit, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLoginWithToken, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const FEATURES = [
  { icon: Zap, label: "Instant file push", desc: "Push files directly from the browser" },
  { icon: GitCommit, label: "ZIP archive deploy", desc: "Upload entire projects at once" },
  { icon: Lock, label: "Session-based auth", desc: "Token never leaves your server session" },
  { icon: Globe, label: "Full repo management", desc: "Create, browse, and delete repos" },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const { toast } = useToast();

  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: { retry: false, queryKey: getGetMeQueryKey() },
  });

  const loginMutation = useLoginWithToken();

  useEffect(() => {
    if (user) setLocation("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    loginMutation.mutate({ data: { token } }, {
      onSuccess: () => {
        toast({ title: "Connected", description: "Welcome to GitPush." });
        setLocation("/dashboard");
      },
      onError: () => {
        toast({
          title: "Authentication failed",
          description: "Invalid token. Make sure it has repo and user scopes.",
          variant: "destructive",
        });
      },
    });
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 border-r border-border p-10 bg-sidebar relative overflow-hidden">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        {/* Glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-primary opacity-[0.12] blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <GitBranch className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="font-mono font-bold text-base tracking-tight">
              Git<span className="text-primary">Push</span>
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground mb-4">
            Your GitHub repos,<br />
            <span className="text-primary">command-center style.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Browse, push, and manage GitHub repositories directly in the browser — no CLI required.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-4">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — auth */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Mobile glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full bg-primary opacity-[0.08] blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10 justify-center">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <GitBranch className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="font-mono font-bold text-base">Git<span className="text-primary">Push</span></span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1.5">Connect your account</h2>
            <p className="text-sm text-muted-foreground">
              Enter a GitHub Personal Access Token to get started.
            </p>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Personal Access Token
              </label>
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono bg-card border-border h-11 focus-visible:ring-primary/40"
                autoComplete="off"
                required
              />
              <p className="text-xs text-muted-foreground font-mono">
                Requires{" "}
                <code className="bg-primary/10 text-primary px-1 py-0.5 rounded text-[11px]">repo</code>{" "}
                and{" "}
                <code className="bg-primary/10 text-primary px-1 py-0.5 rounded text-[11px]">user</code>{" "}
                scopes.{" "}
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Generate one →
                </a>
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-mono font-semibold tracking-wide"
              disabled={loginMutation.isPending || !token.trim()}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Connect to GitHub
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Your token is stored in a server-side session only.
            <br />It is never saved to disk or a database.
          </p>
        </div>
      </div>
    </div>
  );
}
