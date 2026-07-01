import { Link } from "wouter";
import { useGetMe, useGetUserStats, useListRepos } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Star, GitFork, Users, Building, MapPin, Link as LinkIcon,
  Lock, Globe, PlusCircle, BookOpen, TrendingUp, Archive
} from "lucide-react";

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | undefined; icon: any; accent?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
        {value === undefined ? (
          <Skeleton className="h-8 w-14 mt-1" />
        ) : (
          <p className={`text-3xl font-bold font-mono ${accent ? "text-primary" : "text-foreground"}`}>
            {value.toLocaleString()}
          </p>
        )}
      </div>
      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-primary" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: stats, isLoading: isStatsLoading } = useGetUserStats();
  const { data: repos, isLoading: isReposLoading } = useListRepos({ sort: "updated" });

  const recentRepos = repos?.slice(0, 6);

  return (
    <Layout>
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground font-mono">Overview</p>
        </div>
        <Link href="/create">
          <button className="flex items-center gap-1.5 text-xs font-mono bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-semibold">
            <PlusCircle className="w-3.5 h-3.5" />
            New repo
          </button>
        </Link>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Repositories" value={stats?.total_repos} icon={BookOpen} />
          <StatCard label="Stars" value={stats?.total_stars} icon={Star} accent />
          <StatCard label="Forks" value={stats?.total_forks} icon={GitFork} />
          <StatCard label="Private" value={stats?.private_repos} icon={Lock} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">Profile</p>
            {isUserLoading || !user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="w-28 h-4" />
                    <Skeleton className="w-20 h-3" />
                  </div>
                </div>
                <Skeleton className="w-full h-3" />
                <Skeleton className="w-3/4 h-3" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="w-12 h-12 rounded-xl border border-border object-cover"
                  />
                  <div>
                    <p className="font-semibold text-foreground text-sm leading-none">{user.name || user.login}</p>
                    <a
                      href={user.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-mono mt-1 block"
                    >
                      @{user.login}
                    </a>
                  </div>
                </div>

                {user.bio && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{user.bio}</p>
                )}

                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-foreground font-semibold">{user.followers}</span> followers
                  </span>
                  <span>
                    <span className="text-foreground font-semibold">{user.following}</span> following
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground font-mono">
                  {user.company && (
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{user.company}</span>
                    </div>
                  )}
                  {user.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{user.location}</span>
                    </div>
                  )}
                  {user.blog && (
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                      <a
                        href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors truncate"
                      >
                        {user.blog}
                      </a>
                    </div>
                  )}
                </div>

                {/* Languages */}
                {stats && stats.languages.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-2">
                      Top Languages
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {stats.languages.slice(0, 6).map((lang) => (
                        <span
                          key={lang.language}
                          className="inline-flex items-center gap-1 text-[11px] font-mono bg-accent/60 border border-border px-2 py-0.5 rounded-md text-muted-foreground"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {lang.language}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recent Repos */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-foreground">Recently Updated</p>
              </div>
              <Link href="/repos">
                <span className="text-xs text-primary hover:underline font-mono">View all →</span>
              </Link>
            </div>

            <div className="divide-y divide-border">
              {isReposLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="flex-1 h-4" />
                    <Skeleton className="w-12 h-3" />
                  </div>
                ))
              ) : !recentRepos || recentRepos.length === 0 ? (
                <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
                  <Archive className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground font-mono">No repositories yet.</p>
                  <Link href="/create">
                    <span className="text-xs text-primary hover:underline font-mono">Create your first →</span>
                  </Link>
                </div>
              ) : (
                recentRepos.map((repo) => (
                  <Link key={repo.id} href={`/repos/${repo.owner.login}/${repo.name}`}>
                    <div className="px-5 py-3 flex items-center gap-3 hover:bg-accent/30 transition-colors cursor-pointer group">
                      <div className="shrink-0">
                        {repo.private
                          ? <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
                          : <Globe className="w-3.5 h-3.5 text-muted-foreground/40" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-semibold text-primary group-hover:underline truncate">
                          {repo.name}
                        </p>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{repo.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground shrink-0">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5" />
                          {repo.stargazers_count}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
