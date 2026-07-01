import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateRepo } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Lock, Globe, ArrowRight, FileText, ChevronLeft } from "lucide-react";

const createRepoSchema = z.object({
  name: z
    .string()
    .min(1, "Repository name is required")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Only letters, numbers, dashes, underscores, and periods"),
  description: z.string().optional(),
  private: z.boolean().default(false),
  auto_init: z.boolean().default(true),
});

type CreateRepoFormValues = z.infer<typeof createRepoSchema>;

export default function CreateRepo() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createRepoMutation = useCreateRepo();

  const form = useForm<CreateRepoFormValues>({
    resolver: zodResolver(createRepoSchema),
    defaultValues: { name: "", description: "", private: false, auto_init: true },
  });

  const isPrivate = form.watch("private");
  const autoInit = form.watch("auto_init");

  const onSubmit = (data: CreateRepoFormValues) => {
    createRepoMutation.mutate({ data }, {
      onSuccess: (repo) => {
        toast({ title: "Repository created", description: `${repo.full_name} is ready.` });
        setLocation(`/repos/${repo.owner.login}/${repo.name}`);
      },
      onError: (error: any) => {
        toast({
          title: "Creation failed",
          description: error?.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Layout>
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-6 border-b border-border shrink-0">
        <button
          onClick={() => setLocation("/repos")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Repos
        </button>
        <span className="text-muted-foreground/40">/</span>
        <h1 className="text-sm font-semibold text-foreground">New Repository</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Repository Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="my-awesome-project"
                        className="font-mono h-10 bg-card border-border"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground font-mono">
                      Great names are short and memorable.
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Description <span className="text-muted-foreground/60">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What does this project do?"
                        className="resize-none h-20 bg-card border-border text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Visibility */}
              <FormField
                control={form.control}
                name="private"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Visibility
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      {[
                        { value: false, icon: Globe, label: "Public", desc: "Anyone can see this repository." },
                        { value: true, icon: Lock, label: "Private", desc: "Only you can see this repository." },
                      ].map(({ value, icon: Icon, label, desc }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => field.onChange(value)}
                          className={[
                            "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                            field.value === value
                              ? "border-primary bg-primary/8"
                              : "border-border bg-card hover:border-border/80 hover:bg-accent/20",
                          ].join(" ")}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${field.value === value ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <p className={`text-sm font-semibold ${field.value === value ? "text-primary" : "text-foreground"}`}>
                              {label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              {/* Auto-init */}
              <FormField
                control={form.control}
                name="auto_init"
                render={({ field }) => (
                  <FormItem>
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={[
                        "w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-all",
                        field.value
                          ? "border-primary bg-primary/8"
                          : "border-border bg-card hover:border-border/80 hover:bg-accent/20",
                      ].join(" ")}
                    >
                      <FileText className={`w-4 h-4 shrink-0 ${field.value ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${field.value ? "text-primary" : "text-foreground"}`}>
                          Initialize with README
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Adds a README.md so you can clone immediately.
                        </p>
                      </div>
                      <div className={[
                        "w-9 h-5 rounded-full transition-colors flex items-center shrink-0",
                        field.value ? "bg-primary" : "bg-muted border border-border",
                      ].join(" ")}>
                        <span className={[
                          "w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-0.5",
                          field.value ? "translate-x-4" : "translate-x-0",
                        ].join(" ")} />
                      </div>
                    </button>
                  </FormItem>
                )}
              />

              {/* Summary */}
              <div className="rounded-lg bg-card border border-border p-4">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                <div className="font-mono text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    {isPrivate ? <Lock className="w-3 h-3 text-primary" /> : <Globe className="w-3 h-3 text-primary" />}
                    <span className="text-foreground">{form.watch("name") || "repository-name"}</span>
                    <span className="text-muted-foreground/50">— {isPrivate ? "private" : "public"}</span>
                  </div>
                  {autoInit && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-muted-foreground/50" />
                      <span>README.md will be created</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation("/repos")}
                  className="font-mono text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="font-mono font-semibold flex-1"
                  disabled={createRepoMutation.isPending}
                >
                  {createRepoMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                      Creating…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Create Repository
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
