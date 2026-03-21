"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  REPORT_CATEGORIES,
  categoryColor,
  type IncidentType,
} from "@/lib/incidents";
import { cn } from "@/lib/utils";

const TITLE_MAX = 80;
const DESC_MAX = 300;

type Point = { lat: number; lng: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** City default when map center unavailable */
  defaultCenter: Point;
  getMapCenter: () => Point | null;
};

async function ensureUserId(): Promise<{ userId: string } | { error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { error: "Supabase is not configured." };
  }

  const supabase = createClient();
  let {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    const { error: signErr } = await supabase.auth.signInAnonymously();
    if (signErr) {
      return { error: signErr.message };
    }
    ({
      data: { session },
    } = await supabase.auth.getSession());
  }
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "Could not sign you in. Try again." };
  }
  return { userId };
}

function resolveLocation(
  getMapCenter: () => Point | null,
  defaultCenter: Point,
): Promise<{ point: Point; source: "gps" | "map" | "default" }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      const map = getMapCenter();
      resolve({
        point: map ?? defaultCenter,
        source: map ? "map" : "default",
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          point: { lat: p.coords.latitude, lng: p.coords.longitude },
          source: "gps",
        }),
      () => {
        const map = getMapCenter();
        resolve({
          point: map ?? defaultCenter,
          source: map ? "map" : "default",
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12_000 },
    );
  });
}

export function ReportIncidentSheet({
  open,
  onOpenChange,
  defaultCenter,
  getMapCenter,
}: Props) {
  const [step, setStep] = useState<"category" | "details">("category");
  const [category, setCategory] = useState<IncidentType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("category");
    setCategory(null);
    setTitle("");
    setDescription("");
    setSubmitError(null);
    setSuccessNote(null);
    setSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open && closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onOpenChange(false);
  }, [onOpenChange, submitting]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const goNext = () => {
    if (!category) return;
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    const t = title.trim();
    if (!t) {
      setSubmitError("Add a short title.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSuccessNote(null);

    const auth = await ensureUserId();
    if ("error" in auth) {
      setSubmitError(auth.error);
      setSubmitting(false);
      return;
    }

    const { point, source } = await resolveLocation(getMapCenter, defaultCenter);

    const supabase = createClient();
    const desc = description.trim();
    const { error: insErr } = await supabase.from("incidents").insert({
      user_id: auth.userId,
      type: category,
      title: t.slice(0, TITLE_MAX),
      description: desc ? desc.slice(0, DESC_MAX) : null,
      lat: point.lat,
      lng: point.lng,
      is_live: false,
    });

    if (insErr) {
      setSubmitError(insErr.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    if (source === "gps") {
      onOpenChange(false);
      return;
    }
    const note =
      source === "map"
        ? "Pin placed at the center of the map (location unavailable)."
        : "Pin placed at the default city view (location unavailable).";
    setSuccessNote(note);
    const tid = window.setTimeout(() => {
      closeTimerRef.current = null;
      onOpenChange(false);
    }, 2200);
    closeTimerRef.current = tid;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="report-sheet-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={handleClose}
        disabled={submitting}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[min(88dvh,640px)] flex-col rounded-t-2xl border border-border/80 bg-card text-card-foreground shadow-2xl",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
        <div className="flex items-center gap-2 border-b border-border/60 px-4 pb-3 pt-2">
          {step === "details" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Back"
              disabled={submitting}
              onClick={() => setStep("category")}
            >
              <ArrowLeft className="size-4" />
            </Button>
          ) : (
            <span className="w-7 shrink-0" aria-hidden />
          )}
          <h2 id="report-sheet-title" className="flex-1 text-center text-base font-semibold">
            {step === "category" ? "What’s happening?" : "Details"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground"
            disabled={submitting}
            onClick={handleClose}
          >
            Cancel
          </Button>
        </div>

        {step === "category" ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-6">
            <p className="text-center text-sm text-muted-foreground">
              Pick a category. Location is detected when you submit.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {REPORT_CATEGORIES.map((c) => {
                const selected = category === c.type;
                const accent = categoryColor(c.type);
                return (
                  <button
                    key={c.type}
                    type="button"
                    disabled={submitting}
                    onClick={() => setCategory(c.type)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-xl border-2 bg-background/80 p-4 text-center transition-all",
                      "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "shadow-md" : "border-border/80",
                    )}
                    style={
                      selected
                        ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}66` }
                        : undefined
                    }
                  >
                    <span className="text-3xl leading-none" aria-hidden>
                      {c.emoji}
                    </span>
                    <span className="text-xs font-medium leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={!category || submitting}
              onClick={goNext}
            >
              Continue
            </Button>
          </div>
        ) : successNote ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <CheckCircle2 className="size-12 text-primary" aria-hidden />
            <p className="text-sm font-medium text-foreground">Report submitted</p>
            <p className="text-xs text-muted-foreground">{successNote}</p>
            <p className="text-xs text-muted-foreground">
              Your pin appears on the map for everyone in real time.
            </p>
          </div>
        ) : (
          <form
            className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-6"
            onSubmit={handleSubmit}
          >
            <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                We request your location when you submit. If you deny access, we use the map center or default city.
              </span>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="report-title" className="text-xs font-medium text-foreground">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                id="report-title"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Short headline"
                maxLength={TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                autoComplete="off"
              />
              <p className="text-right text-[0.65rem] text-muted-foreground">
                {title.length}/{TITLE_MAX}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="report-desc" className="text-xs font-medium text-foreground">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="report-desc"
                className="min-h-[100px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="What did you see?"
                maxLength={DESC_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
              />
              <p className="text-right text-[0.65rem] text-muted-foreground">
                {description.length}/{DESC_MAX}
              </p>
            </div>

            {submitError ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {submitError}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full gap-2"
              size="lg"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit report"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
