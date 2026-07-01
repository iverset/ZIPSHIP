import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  useGetRepo,
  useListContents,
  useListBranches,
  useListCommits,
  usePushFile,
  useDeleteRepo,
  getGetRepoQueryKey,
  getListContentsQueryKey,
  getListBranchesQueryKey,
  getListCommitsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Layout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ZipPush } from "@/components/zip-push";

import {
  Folder, File as FileIcon, GitBranch, GitCommit,
  Star, GitFork, Lock, Globe, ExternalLink, Copy,
  AlertTriangle, Clock, Shield, Send, FileArchive,
  ChevronLeft, Check,
} from "lucide-react";

const pushSchema = z.object({
  path: z.string().min(1, "File path is required").regex(/^[^\s]/, "Path cannot start with space"),
  content: z.string().min(1, "File content is required"),
  message: z.string().min(1, "Commit message is required"),
  branch: z.string().optional(),
});

type PushFormValues = z.infer<typeof pushSchema>;

export default function RepoDetail() {
  const params = useParams();
  const owner = params.owner || "";
  const name = params.name || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("files");
  const [pushMode, setPushMode] = useState<"file" | "zip">("zip");
  const [copied, setCopied] = useState(false);

  const { data: repo, isLoading: isRepoLoading } = useGetRepo(owner, name, {
    query: { enabled: !!owner && !!name, queryKey: getGetRepoQueryKey(owner, name) },
  });

  const { data: contents, isLoading: isContentsLoading } = useListContents(owner, name, {
    query: { enabled: activeTab === "files" && !!owner && !!name, queryKey: getListContentsQueryKey(owner, name) },
  });

  const { data: branches, isLoading: isBranchesLoading } = useListBranches(owner, name, {
    query: { enabled: activeTab === "branches" && !!owner && !!name, queryKey: getListBranchesQueryKey(owner, name) },
  });

  const { data: commits, isLoading: isCommitsLoading } = useListCommits(owner, name, {
    query: { enabled: activeTab === "commits" && !!owner && !!name, queryKey: getListCommitsQueryKey(owner, name) },
  });

  const pushMutation = usePushFile();
  const deleteMutation = useDeleteRepo();

  const form = useForm<PushFormValues>({
    resolver: zodResolver(pushSchema),
    defaultValues: { path: "", content: "", message: "", branch: "" },
  });

  const onPush = (data: PushFormValues) => {
    pushMutation.mutate(
      {
        owner,
        repo: name,
        data: {
          path: data.path,
          content: data.content,
          message: data.message,
          branch: data.branch || repo?.default_branch || "main",
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Push successful", description: `Committed ${data.path}.` });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListContentsQueryKey(owner, name) });
          queryClient.invalidateQueries({ queryKey: getListCommitsQueryKey(owner, name) });
          setActiveTab("files");
        },
        onError: (error: any) => {
          toast({ title: "Push failed", description: error?.message || "Failed to push file.", variant: "destructive" });
        },
      }
    );
  };

  const onDelete = () => {
    deleteMutation.mutate(
      { owner, repo: name },
      {
        onSuccess: () => {
          toast({ title: "Repository deleted", description: `${owner}/${name} has been deleted.` });
          setLocation("/repos");
        },
        onError: (error: any) => {
          toast({ title: "Delete failed", description: error?.message || "Failed to delete.", variant: "destructive" });
        },
      }
    );
  };

  const copyCloneUrl = () => {
    if (repo?.clone_url) {
      navigator.clipboard.writeText(repo.clone_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isRepoLoading || !repo) {
    return (
      <Layout>
        <div className="h-14 flex items-center px-6 border-b border-border">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header bar */}
      <div className="h-14 flex items-center gap-3 px-6 border-b border-border shrink-0">
        <Link href="/repos">
          <span className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors cursor-pointer">
            <ChevronLeft className="w-3.5 h-3.5" />
            Repos
          </span>
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-xs font-mono text-muted-foreground">{owner}</span>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-xs font-mono font-semibold text-foreground">{name}</span>
        <Badge
          variant="outline"
          className="ml-1 font-mono text-[10px] py-0 h-4 px-1.5 border-border text-muted-foreground"
        >
          {repo.private ? "private" : "public"}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Repo meta card */}
        <div className="px-6 pt-5 pb-4 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                {repo.private ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                <h1 className="text-xl font-bold font-mono text-foreground">
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    {owner}
                  </a>
                  <span className="text-muted-foreground mx-1">/</span>
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    {name}
                  </a>
                  <ExternalLink className="inline w-3.5 h-3.5 ml-1.5 text-muted-foreground/50 align-middle" />
                </h1>
              </div>

              {repo.description && (
                <p className="text-sm text-muted-foreground">{repo.description}</p>
              )}

              <div className="flex items-center flex-wrap gap-4 text-xs font-mono text-muted-foreground">
                {repo.language && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    {repo.language}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" />
                  {repo.stargazers_count} stars
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3.5 h-3.5" />
                  {repo.forks_count} forks
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {repo.open_issues_count || 0} issues
                </span>
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5" />
                  {repo.default_branch}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:flex-col md:items-end shrink-0">
              {/* Clone URL */}
              <div className="flex items-center rounded-md border border-border bg-card overflow-hidden text-xs font-mono">
                <span className="px-2.5 py-1.5 bg-muted/40 border-r border-border text-muted-foreground text-[11px]">clone</span>
                <span className="px-3 py-1.5 text-muted-foreground max-w-[200px] truncate">
                  {repo.clone_url}
                </span>
                <button
                  onClick={copyCloneUrl}
                  className="px-2.5 py-1.5 border-l border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy clone URL"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Delete */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs font-mono text-destructive/70 hover:text-destructive hover:bg-destructive/8 px-2.5 py-1.5 rounded-md border border-transparent hover:border-destructive/20 transition-all">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-border bg-card">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-mono text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Delete repository
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-muted-foreground">
                      This permanently deletes{" "}
                      <span className="font-mono font-semibold text-foreground">{repo.full_name}</span>{" "}
                      including all commits, branches, and files. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-mono text-sm">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono text-sm"
                    >
                      {deleteMutation.isPending ? "Deleting…" : "Delete permanently"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto w-full justify-start gap-0 mb-4">
              {[
                { value: "files", label: "Files", icon: Folder },
                { value: "branches", label: "Branches", icon: GitBranch },
                { value: "commits", label: "Commits", icon: GitCommit },
                { value: "push", label: "Push", icon: Send },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-mono text-sm px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 mr-1.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Files */}
            <TabsContent value="files" className="m-0">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20">
                  <Folder className="w-4 h-4 text-primary" />
                  <span className="font-mono text-sm font-semibold text-foreground">{name}</span>
                  <span className="text-muted-foreground/40">/</span>
                </div>
                <div className="divide-y divide-border">
                  {isContentsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <Skeleton className="w-4 h-4" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    ))
                  ) : !contents || contents.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-muted-foreground font-mono">Repository is empty.</p>
                      <button
                        onClick={() => setActiveTab("push")}
                        className="text-xs text-primary hover:underline font-mono mt-2 block mx-auto"
                      >
                        Push your first file →
                      </button>
                    </div>
                  ) : (
                    contents
                      .sort((a, b) => {
                        if (a.type === "dir" && b.type !== "dir") return -1;
                        if (a.type !== "dir" && b.type === "dir") return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((file) => (
                        <div key={file.sha} className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/20 transition-colors group">
                          <div className="flex items-center gap-3 min-w-0">
                            {file.type === "dir" ? (
                              <Folder className="w-4 h-4 text-primary/70 shrink-0" />
                            ) : (
                              <FileIcon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                            )}
                            <a
                              href={file.html_url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm text-foreground hover:text-primary transition-colors truncate"
                            >
                              {file.name}
                            </a>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {file.type === "file" && file.size !== undefined && (
                              <span>{(file.size / 1024).toFixed(1)} KB</span>
                            )}
                            <a href={file.html_url || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Branches */}
            <TabsContent value="branches" className="m-0">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-primary" />
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {branches?.length ?? "—"} branch{branches?.length !== 1 ? "es" : ""}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {isBranchesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="px-4 py-4 flex items-center gap-3">
                        <Skeleton className="w-4 h-4" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </div>
                    ))
                  ) : !branches || branches.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground font-mono">No branches found.</div>
                  ) : (
                    branches.map((branch) => (
                      <div key={branch.name} className="flex items-center justify-between px-4 py-3.5 hover:bg-accent/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <GitBranch className="w-4 h-4 text-primary/60 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-foreground">{branch.name}</span>
                              {branch.name === repo.default_branch && (
                                <Badge variant="outline" className="font-mono text-[10px] py-0 h-4 px-1.5 border-primary/40 text-primary">
                                  default
                                </Badge>
                              )}
                              {branch.protected && (
                                <Badge variant="outline" className="font-mono text-[10px] py-0 h-4 px-1.5 border-amber-500/30 text-amber-400 flex items-center gap-1">
                                  <Shield className="w-2.5 h-2.5" />
                                  protected
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">
                              <GitCommit className="inline w-3 h-3 mr-1" />
                              {branch.sha.substring(0, 7)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Commits */}
            <TabsContent value="commits" className="m-0">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-primary" />
                  <span className="font-mono text-sm font-semibold text-foreground">
                    Commits on <span className="text-primary">{repo.default_branch}</span>
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {isCommitsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="px-4 py-4 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    ))
                  ) : !commits || commits.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground font-mono">No commits found.</div>
                  ) : (
                    commits.map((commit) => (
                      <div key={commit.sha} className="px-4 py-3.5 flex gap-3 hover:bg-accent/20 transition-colors group">
                        <div className="shrink-0 mt-0.5">
                          {commit.author_avatar ? (
                            <img
                              src={commit.author_avatar}
                              alt={commit.author_name}
                              className="w-7 h-7 rounded-md border border-border"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center text-xs font-mono text-primary">
                              {commit.author_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate mb-1">
                            {commit.message.split("\n")[0]}
                          </p>
                          <div className="flex items-center flex-wrap gap-3 text-xs font-mono text-muted-foreground">
                            <span className="font-semibold text-foreground/80">{commit.author_name}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(commit.author_date), "MMM d, yyyy")}
                            </span>
                            <a
                              href={commit.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
                            >
                              {commit.sha.substring(0, 7)}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Push */}
            <TabsContent value="push" className="m-0 space-y-4">
              {/* Mode toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border w-fit">
                {[
                  { value: "zip" as const, icon: FileArchive, label: "ZIP Upload" },
                  { value: "file" as const, icon: Send, label: "Single File" },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPushMode(value)}
                    className={[
                      "flex items-center gap-2 px-3.5 py-1.5 rounded-md font-mono text-xs font-semibold transition-all",
                      pushMode === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* ZIP mode */}
              {pushMode === "zip" && (
                <ZipPush owner={owner} repo={name} defaultBranch={repo.default_branch} />
              )}

              {/* Single file mode */}
              {pushMode === "file" && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    <span className="font-mono text-sm font-semibold text-foreground">Push a single file</span>
                  </div>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onPush)}>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="path"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                  File Path
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="src/index.js"
                                    className="font-mono h-9 bg-background/60 border-border text-sm"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="branch"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                  Branch <span className="text-muted-foreground/50">(optional)</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={`Defaults to ${repo.default_branch}`}
                                    className="font-mono h-9 bg-background/60 border-border text-sm"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                Commit Message
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Update file"
                                  className="font-mono h-9 bg-background/60 border-border text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                File Content
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="// write your code here..."
                                  className="font-mono text-sm min-h-[280px] bg-[#090c12] text-[#cdd9e5] border-border focus-visible:ring-primary/40 resize-y"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="px-5 py-3.5 border-t border-border flex justify-end bg-muted/10">
                        <Button
                          type="submit"
                          className="font-mono font-semibold"
                          disabled={pushMutation.isPending}
                        >
                          {pushMutation.isPending ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                              Pushing…
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Send className="w-4 h-4" />
                              Commit & Push
                            </span>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
