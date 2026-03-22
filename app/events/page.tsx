import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { listAllIncidents } from "@/lib/list-incidents";
import { categoryLabel } from "@/lib/incidents";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "All events | LafdaMap",
  description: "Browse incidents reported on LafdaMap",
};

export default async function EventsPage() {
  const incidents = await listAllIncidents();

  return (
    <main className="min-h-dvh bg-background px-4 pb-12 pt-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">All events</h1>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Map
          </Link>
        </div>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No incidents yet. Open the map and report one.
          </p>
        ) : (
          <ul className="space-y-2">
            {incidents.map((inc) => (
              <li key={inc.id}>
                <Link
                  href={`/incident/${inc.id}`}
                  className="block rounded-xl border border-border/80 bg-card/50 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="font-medium leading-snug">{inc.title}</div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{categoryLabel(inc.type)}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(inc.created_at)}</span>
                    {inc.is_live ? (
                      <>
                        <span>·</span>
                        <span className="font-medium text-destructive">LIVE</span>
                      </>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
