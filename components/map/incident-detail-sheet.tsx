"use client";

import { useCallback, useEffect } from "react";
import { IncidentDetailCard } from "@/components/map/incident-detail-card";
import { Button } from "@/components/ui/button";
import type { IncidentRow } from "@/lib/incidents";

type Props = {
  incident: IncidentRow | null;
  onClose: () => void;
};

export function IncidentDetailSheet({ incident, onClose }: Props) {
  const open = incident !== null;

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  if (!incident) return null;

  return (
    <div
      className="fixed inset-0 z-[45] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={handleClose}
      />
      <div className="relative z-10 flex max-h-[min(88dvh,640px)] flex-col rounded-t-2xl border border-border/80 bg-card text-card-foreground shadow-2xl">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border/60 px-2 pb-3 pt-2 sm:px-4">
          <span aria-hidden className="min-w-0" />
          <h2
            id="incident-detail-title"
            className="text-center text-base font-semibold"
          >
            Incident
          </h2>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </div>
        <div className="overflow-y-auto p-4 pb-6">
          <IncidentDetailCard incident={incident} variant="sheet" />
        </div>
      </div>
    </div>
  );
}
