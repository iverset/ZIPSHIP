import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getListContentsQueryKey } from "@workspace/api-client-react";
import {
  UploadCloud,
  FileArchive,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GitCommit,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface ZipPushProps {
  owner: string;
  repo: string;
  defaultBranch: string;
}

interface PushResult {
  pushed_count: number;
  skipped_count: number;
  failed_count: number;
  pushed: string[];
  skipped: string[];
  failed: { path: string; error: string }[];
  branch: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ZipPush({ owner, repo, defaultBranch }: ZipPushProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("Upload via GitPush");
  const [branch, setBranch] = useState("");
  const [stripRoot, setStripRoot] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const acceptFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".zip")) {
      toast({ title: "Invalid file", description: "Only .zip files are supported.", variant: "destructive" });
      return;
    }
    setFile(f);
    setResult(null);
  }, [toast]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) acceptFile(dropped);
  }, [acceptFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) acceptFile(selected);
    e.target.value = "";
  }, [acceptFile]);

  const handleUpload = async () => {
    if (!file || !message.trim()) return;
    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("message", message);
    if (branch.trim()) formData.append("branch", branch.trim());
    formData.append("strip_root", String(stripRoot));

    try {
      const res = await fetch(`/api/github/repos/${owner}/${repo}/push-zip`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Upload failed", description: data.error ?? "Unknown error", variant: "destructive" });
        return;
      }

      const pushResult = data as PushResult;
      setResult(pushResult);

      queryClient.invalidateQueries({ queryKey: getListContentsQueryKey(owner, repo) });

      if (pushResult.failed_count === 0) {
        toast({
          title: "ZIP pushed successfully",
          description: `${pushResult.pushed_count} file${pushResult.pushed_count !== 1 ? "s" : ""} pushed to ${pushResult.branch}.`,
        });
      } else {
        toast({
          title: "Push completed with errors",
          description: `${pushResult.pushed_count} pushed, ${pushResult.failed_count} failed.`,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm border-t-primary/50 border-t-2">
      <CardHeader>
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <FileArchive className="w-5 h-5 text-primary" />
          Push ZIP Archive
        </CardTitle>
        <CardDescription className="font-mono text-xs">
          Drag and drop a ZIP file to push all its contents directly to this repository.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          data-testid="zip-dropzone"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={[
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer select-none",
            "min-h-[200px] p-8 text-center",
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01]"
              : file
              ? "border-primary/40 bg-primary/5 cursor-default"
              : "border-border hover:border-primary/60 hover:bg-accent/30",
          ].join(" ")}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            onChange={onFileChange}
            data-testid="zip-file-input"
          />

          {file ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="w-14 h-14 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <FileArchive className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-mono font-semibold text-foreground text-sm">{file.name}</p>
                <p className="font-mono text-xs text-muted-foreground mt-1">{formatBytes(file.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="font-mono text-xs text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                data-testid="zip-remove-file"
              >
                <X className="w-3 h-3 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={[
                "w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
                isDragging ? "bg-primary/20 border border-primary" : "bg-muted border border-border",
              ].join(" ")}>
                <UploadCloud className={["w-7 h-7 transition-colors", isDragging ? "text-primary" : "text-muted-foreground"].join(" ")} />
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {isDragging ? "Drop it here" : "Drag & drop your ZIP"}
                </p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  or <span className="text-primary underline underline-offset-2">click to browse</span> — max 50 MB, up to 200 files
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-mono text-xs text-muted-foreground uppercase">Commit Message</label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Upload via GitPush"
              className="font-mono bg-background/50"
              data-testid="zip-commit-message"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-xs text-muted-foreground uppercase">Branch (Optional)</label>
            <Input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder={`Defaults to ${defaultBranch}`}
              className="font-mono bg-background/50"
              data-testid="zip-branch"
            />
          </div>
        </div>

        {/* Strip root folder toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none group" data-testid="zip-strip-root">
          <div
            role="checkbox"
            aria-checked={stripRoot}
            onClick={() => setStripRoot((v) => !v)}
            className={[
              "w-9 h-5 rounded-full transition-colors flex items-center shrink-0",
              stripRoot ? "bg-primary" : "bg-muted",
            ].join(" ")}
          >
            <span className={[
              "w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5",
              stripRoot ? "translate-x-4" : "translate-x-0",
            ].join(" ")} />
          </div>
          <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            Strip root folder from paths{" "}
            <span className="text-muted-foreground/60">(e.g. <code>my-project/src/index.js</code> → <code>src/index.js</code>)</span>
          </span>
        </label>

        {/* Result */}
        {result && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {result.pushed_count} pushed
              </span>
              {result.skipped_count > 0 && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <GitCommit className="w-3.5 h-3.5" />
                  {result.skipped_count} skipped
                </span>
              )}
              {result.failed_count > 0 && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {result.failed_count} failed
                </span>
              )}
              <Badge variant="outline" className="ml-auto font-mono text-xs">
                → {result.branch}
              </Badge>
            </div>

            {(result.pushed.length > 0 || result.failed.length > 0) && (
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {showDetails ? "Hide" : "Show"} details
              </button>
            )}

            {showDetails && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.pushed.map((p) => (
                  <div key={p} className="flex items-center gap-2 text-primary/80">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{p}</span>
                  </div>
                ))}
                {result.failed.map((f) => (
                  <div key={f.path} className="flex items-start gap-2 text-destructive">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span className="truncate">{f.path}: {f.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-muted/20 border-t border-border px-6 py-4 flex justify-end">
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || !message.trim() || isUploading}
          className="font-mono font-bold"
          data-testid="zip-push-button"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Pushing files...
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4 mr-2" />
              Push ZIP to Repository
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
