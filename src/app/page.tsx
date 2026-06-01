import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6">
        <div className="w-full space-y-5 rounded-lg border bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">RAGdoll Chat</h1>
            <p className="text-muted-foreground text-sm">
              Open an agent chat link or start an external access-key session.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/external">
              <KeyRound className="h-4 w-4" />
              External access-key chat
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
