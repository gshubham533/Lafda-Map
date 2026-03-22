"use client";

import { useState } from "react";
import Link from "next/link";
import { Radio, Share2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  anonymousReporterHandle,
  categoryColor,
  categoryLabel,
  type IncidentRow,
} from "@/lib/incidents";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

type Props = {
  incident: IncidentRow;
  variant?: "sheet" | "page";
  className?: string;
  /** Active live_sessions.id when this incident is live */
  liveSessionId?: string | null;
  liveViewerCount?: number | null;
  onGoLive?: () => void;
  onWatchLive?: () => void;
  actionError?: string | null;
  /** When set, only the reporter can use Go live */
  currentUserId?: string | null;
};

export function IncidentDetailCard({
  incident,
  variant = "sheet",
  className,
  liveSessionId,
  liveViewerCount,
  onGoLive,
  onWatchLive,
  actionError,
  currentUserId,
}: Props) {
  const [shareHint, setShareHint] = useState<string | null>(null);
  const accent = categoryColor(incident.type);
  const label = categoryLabel(incident.type);
  const when = formatRelativeTime(incident.created_at);
  const reporter = anonymousReporterHandle(incident.user_id);
  const isReporter =
    Boolean(incident.user_id) &&
    Boolean(currentUserId) &&
    incident.user_id === currentUserId;

  async function share() {
    const url = `${window.location.origin}/incident/${incident.id}`;
    setShareHint(null);
    try {
      if (navigator.share) {
        await navigator.share({
          title: incident.title,
          text: incident.description ?? incident.title,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareHint("Link copied");
      window.setTimeout(() => setShareHint(null), 2500);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareHint("Link copied");
        window.setTimeout(() => setShareHint(null), 2500);
      } catch {
        setShareHint("Could not copy link");
        window.setTimeout(() => setShareHint(null), 2500);
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {variant === "page" ? (
        <Link
          href={`/?incident=${incident.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
        >
          View on map
        </Link>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
          style={{ borderColor: `${accent}99`, color: accent, backgroundColor: `${accent}14` }}
        >
          {label}
        </span>
        {incident.is_live ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
            </span>
            LIVE
            {liveViewerCount != null && liveViewerCount > 0 ? (
              <span className="font-normal opacity-90">· {liveViewerCount} watching</span>
            ) : null}
          </span>
        ) : null}
      </div>

      <div>
        <h3 className="text-lg font-semibold leading-snug text-foreground">
          {incident.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {when}
          <span className="mx-1.5 text-border">·</span>
          <span className="font-mono">{reporter}</span>
        </p>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
        {incident.description?.trim() ? (
          <p className="whitespace-pre-wrap text-foreground/90">{incident.description}</p>
        ) : (
          <p className="italic">No description</p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          className="gap-2 sm:flex-1"
          onClick={() => void share()}
        >
          <Share2 className="size-4" aria-hidden />
          Share
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="gap-2 sm:flex-1"
          disabled={!incident.is_live || !liveSessionId || !onWatchLive}
          title={
            !incident.is_live
              ? "No active stream"
              : !liveSessionId
                ? "Loading session…"
                : undefined
          }
          onClick={onWatchLive}
        >
          <Video className="size-4" aria-hidden />
          Watch live
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="gap-2 sm:flex-1"
          disabled={incident.is_live || !onGoLive || !isReporter}
          title={
            incident.is_live
              ? "Someone is already live on this pin"
              : !isReporter
                ? "Only the person who reported this can go live"
                : undefined
          }
          onClick={onGoLive}
        >
          <Radio className="size-4" aria-hidden />
          Go live here
        </Button>
      </div>

      {actionError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive-foreground">
          {actionError}
        </p>
      ) : null}

      {shareHint ? (
        <p className="text-center text-xs text-muted-foreground">{shareHint}</p>
      ) : null}
    </div>
  );
}
