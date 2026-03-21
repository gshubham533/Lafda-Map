"use client";

import { Button } from "@/components/ui/button";
import {
  FILTER_OPTIONS,
  type IncidentFilter,
} from "@/lib/incidents";
import { cn } from "@/lib/utils";

type Props = {
  value: IncidentFilter;
  onChange: (v: IncidentFilter) => void;
  className?: string;
};

export function FilterChips({ value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 rounded-xl border border-border/80 bg-card/95 p-1.5 shadow-md backdrop-blur-sm",
        className,
      )}
      role="tablist"
      aria-label="Incident categories"
    >
      {FILTER_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            variant={active ? "default" : "outline"}
            size="sm"
            className="h-8 rounded-lg text-xs"
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
