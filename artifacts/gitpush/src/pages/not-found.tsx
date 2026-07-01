import { Link } from "wouter";
import { Terminal, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center mx-auto">
          <Terminal className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-5xl font-bold font-mono text-primary mb-2">404</h1>
          <p className="text-lg font-semibold text-foreground">Page not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            The page you're looking for doesn't exist or was moved.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" className="font-mono">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}
