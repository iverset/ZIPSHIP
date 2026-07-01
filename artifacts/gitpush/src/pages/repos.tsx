import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useListRepos } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, GitFork, Lock, Globe, X, PlusCircle, Archive } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Repos() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("updated");

  const { data: repos, isLoading } = useListRepos({ sort: sortBy as any });

  const filteredRepos = useMemo(() => {
    if (!repos) return [];
    return repos.filter((repo) => {
      const matchesSearch =
        repo.name.toLowerCase().includes(search.toLowerCase()) ||
        (repo.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesType =
        filterType === "all" ||
        (filterType === "private" && repo.private) ||
        (filterType === "public" && !repo.private);
      return matchesSearch && matchesType;
    });
  }, [repos, search, filterType]);

  const hasFilters = search || filterType !== "all" || sortBy !== "updated";

  return (
    <Layout>
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Repositories</h1>
          <p className="text-xs text-muted-foreground font-mono">
            {repos ? `${repos.length} total` : "Loading…"}
          </p>
        </div>
        <Link href="/create">
          <button className="flex items-center gap-1.5 text-xs font-mono bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-semibold">
            <PlusCircle className="w-3.5 h-3.5" />
            New repo
          </button>
        </Link>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-3.5 border-b border-border bg-sidebar/40 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm font-mono bg-card border-border"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 h-8 text-xs font-mono bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">All types</SelectItem>
              <SelectItem value="public" className="text-xs font-mono">Public</SelectItem>
              <SelectItem value="private" className="text-xs font-mono">Private</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 h-8 text-xs font-mono bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated" className="text-xs font-mono">Last updated</SelectItem>
              <SelectItem value="created" className="text-xs font-mono">Created</SelectItem>
              <SelectItem value="pushed" className="text-xs font-mono">Last pushed</SelectItem>
              <SelectItem value="full_name" className="text-xs font-mono">Name</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setFilterType("all"); setSortBy("updated"); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono h-8 px-2 rounded-md hover:bg-accent transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-3.5 h-3.5 rounded bg-border animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-border rounded animate-pulse" />
                    <div className="h-3 w-72 bg-border rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-20 bg-border rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <Archive className="w-10 h-10 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-semibold text-foreground">No repositories found</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {hasFilters ? "Try adjusting your filters." : "Create your first repository."}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredRepos.map((repo) => (
                <Link key={repo.id} href={`/repos/${repo.owner.login}/${repo.name}`}>
                  <div className="px-6 py-4 flex items-start gap-4 hover:bg-accent/20 transition-colors cursor-pointer group">
                    {/* Visibility icon */}
                    <div className="mt-0.5 shrink-0">
                      {repo.private
                        ? <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
                        : <Globe className="w-3.5 h-3.5 text-muted-foreground/40" />
                      }
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-mono font-semibold text-primary group-hover:underline truncate">
                          {repo.full_name}
                        </h3>
                        {repo.private && (
                          <Badge variant="outline" className="font-mono text-[10px] py-0 h-4 px-1.5 border-border text-muted-foreground shrink-0">
                            private
                          </Badge>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                        {repo.language && (
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {repo.stargazers_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3 h-3" />
                          {repo.forks_count}
                        </span>
                        <span>
                          Updated {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
